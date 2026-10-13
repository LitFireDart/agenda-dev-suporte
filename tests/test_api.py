import os
import sys
import time
import threading
import unittest
import requests
import uvicorn

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User, Appointment, HistoryLog


class ServerThread(threading.Thread):
    def __init__(self, app, host="127.0.0.1", port=8001):
        super().__init__()
        self.config = uvicorn.Config(app=app, host=host, port=port, log_level="error")
        self.server = uvicorn.Server(self.config)
        self.daemon = True

    def run(self):
        self.server.run()

    def stop(self):
        self.server.should_exit = True


class TestDevAgendaAPI(unittest.TestCase):
    server_thread = None
    base_url = "http://127.0.0.1:8001"
    token = None
    created_id = None

    @classmethod
    def setUpClass(cls):
        from app.security import hash_password

        db = SessionLocal()
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            admin.hashed_password = hash_password("admin123")
            db.commit()
        db.close()

        # Iniciar servidor Uvicorn em background na porta 8001 para testes
        cls.server_thread = ServerThread(app=app, port=8001)
        cls.server_thread.start()

        # Aguardar servidor inicializar
        for _ in range(30):
            try:
                res = requests.get(f"{cls.base_url}/health", timeout=1)
                if res.status_code == 200:
                    break
            except Exception:
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        if cls.server_thread:
            cls.server_thread.stop()

    def test_01_healthcheck(self):
        """Verifica se o endpoint de saúde responde OK."""
        res = requests.get(f"{self.base_url}/health", timeout=3)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "ok")

    def test_02_login_failed(self):
        """Verifica que credenciais incorretas são rejeitadas com 401."""
        res = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": "usuario_inexistente", "password": "senha_errada"},
            timeout=3,
        )
        self.assertEqual(res.status_code, 401)

    def test_03_login_success(self):
        """Verifica login com usuário administrador padrão."""
        res = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=3,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["username"], "admin")
        TestDevAgendaAPI.token = data["access_token"]

    def test_04_unauthorized_access(self):
        """Verifica que rotas protegidas rejeitam requisição sem token."""
        res = requests.get(f"{self.base_url}/api/appointments", timeout=3)
        self.assertEqual(res.status_code, 401)

    def test_05_get_me(self):
        """Verifica obtenção do perfil do usuário autenticado."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        res = requests.get(f"{self.base_url}/api/auth/me", headers=headers, timeout=3)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["username"], "admin")

    def test_05b_update_profile_name(self):
        """Verifica alteração do nome de exibição do usuário."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        payload = {
            "name": "José - Desenvolvedor & Suporte",
            "email": "jose@empresa.com",
        }
        res = requests.put(
            f"{self.base_url}/api/auth/profile",
            json=payload,
            headers=headers,
            timeout=3,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["name"], "José - Desenvolvedor & Suporte")
        self.assertEqual(data["email"], "jose@empresa.com")

        # Confirmar via GET /me
        get_res = requests.get(
            f"{self.base_url}/api/auth/me", headers=headers, timeout=3
        )
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["name"], "José - Desenvolvedor & Suporte")

    def test_06_create_appointment(self):
        """Verifica criação de um novo compromisso com auditoria."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        payload = {
            "title": "Correção de Bug Crítico no Checkout",
            "system_client": "Portal Web / E-Commerce",
            "category": "Bugfix",
            "priority": "Urgente",
            "status": "Pendente",
            "start_date": "2026-09-25",
            "start_time": "14:00",
            "end_date": "2026-09-25",
            "end_time": "16:00",
            "is_all_day": False,
            "description": "Erro 500 no processamento de pagamento via PIX.",
            "external_link": "https://github.com/issue/123",
        }
        res = requests.post(
            f"{self.base_url}/api/appointments",
            json=payload,
            headers=headers,
            timeout=3,
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["title"], payload["title"])
        self.assertEqual(data["priority"], "Urgente")
        TestDevAgendaAPI.created_id = data["id"]

    def test_07_search_and_filter_appointments(self):
        """Verifica busca textual e filtros."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        # Busca por 'Checkout'
        res = requests.get(
            f"{self.base_url}/api/appointments?search=Checkout",
            headers=headers,
            timeout=3,
        )
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("Checkout", results[0]["title"])

        # Filtro por status 'Pendente'
        res_status = requests.get(
            f"{self.base_url}/api/appointments?status=Pendente",
            headers=headers,
            timeout=3,
        )
        self.assertEqual(res_status.status_code, 200)
        self.assertTrue(all(r["status"] == "Pendente" for r in res_status.json()))

    def test_08_quick_status_update_and_resolution(self):
        """Verifica atualização de status para Concluído com notas de resolução."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        payload = {
            "status": "Concluído",
            "resolution_notes": "Corrigido o timeout no webhook do gateway e testado com sucesso.",
        }
        res = requests.patch(
            f"{self.base_url}/api/appointments/{TestDevAgendaAPI.created_id}/status",
            json=payload,
            headers=headers,
            timeout=3,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "Concluído")
        self.assertEqual(data["resolution_notes"], payload["resolution_notes"])

    def test_09_history_logs_recorded(self):
        """Verifica se os logs de criação e conclusão foram registrados no histórico."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        res = requests.get(f"{self.base_url}/api/history", headers=headers, timeout=3)
        self.assertEqual(res.status_code, 200)
        logs = res.json()
        self.assertGreater(len(logs), 0)
        actions = [log["action"] for log in logs]
        self.assertTrue(any(a in ["CRIACAO", "CONCLUSAO"] for a in actions))

    def test_10_dashboard_stats(self):
        """Verifica os contadores das estatísticas."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        res = requests.get(f"{self.base_url}/api/stats", headers=headers, timeout=3)
        self.assertEqual(res.status_code, 200)
        stats = res.json()
        self.assertIn("total_appointments", stats)
        self.assertIn("completed", stats)
        self.assertGreaterEqual(stats["completed"], 1)

    def test_11_static_pages_served(self):
        """Verifica se os arquivos estáticos e HTMLs são servidos corretamente."""
        res_home = requests.get(f"{self.base_url}/", timeout=3)
        self.assertEqual(res_home.status_code, 200)
        self.assertIn("DevAgenda", res_home.text)

        res_login = requests.get(f"{self.base_url}/login", timeout=3)
        self.assertEqual(res_login.status_code, 200)
        self.assertIn("DevAgenda - Login do Sistema", res_login.text)

    def test_12_delete_appointment(self):
        """Verifica exclusão de compromisso."""
        headers = {"Authorization": f"Bearer {TestDevAgendaAPI.token}"}
        res = requests.delete(
            f"{self.base_url}/api/appointments/{TestDevAgendaAPI.created_id}",
            headers=headers,
            timeout=3,
        )
        self.assertEqual(res.status_code, 200)

        # Confirmar que não existe mais (404)
        get_res = requests.get(
            f"{self.base_url}/api/appointments/{TestDevAgendaAPI.created_id}",
            headers=headers,
            timeout=3,
        )
        self.assertEqual(get_res.status_code, 404)


if __name__ == "__main__":
    unittest.main()

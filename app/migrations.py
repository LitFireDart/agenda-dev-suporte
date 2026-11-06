"""Ajustes de esquema para bancos SQLite já existentes.

O `Base.metadata.create_all` só cria tabelas novas; ele não adiciona colunas a
tabelas que já existem. Por isso, ao atualizar o sistema, o agenda.db antigo
precisa receber as colunas novas aqui (sem perder nenhum dado).
"""

from sqlalchemy import text


def _columns(conn, table: str) -> set:
    return {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}


def run_migrations(engine) -> None:
    with engine.begin() as conn:
        if "completed_at" not in _columns(conn, "appointments"):
            conn.execute(text("ALTER TABLE appointments ADD COLUMN completed_at DATETIME"))

            # Preenche as tarefas que já estavam concluídas. A melhor fonte é o
            # último registro do histórico que mudou o status para "Concluído";
            # se não houver, usa a data da última atualização.
            conn.execute(
                text(
                    """
                    UPDATE appointments
                       SET completed_at = COALESCE(
                           (SELECT MAX(h.timestamp)
                              FROM history_logs h
                             WHERE h.appointment_id = appointments.id
                               AND h.action = 'CONCLUSAO'
                               AND (h.description LIKE '%para ''Concluído''%'
                                    OR h.description LIKE '%➔ ''Concluído''%')),
                           updated_at,
                           created_at
                       )
                     WHERE status = 'Concluído'
                    """
                )
            )

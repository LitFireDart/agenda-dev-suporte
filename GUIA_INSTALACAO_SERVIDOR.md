# Guia de Instalação do DevAgenda em Servidor Web Externo (VPS / Nuvem)

Este guia prático explica passo a passo como colocar o **DevAgenda** no ar em um servidor na nuvem (VPS na DigitalOcean, AWS EC2, Linode, Hetzner, Contabo, Oracle Cloud, etc.) para que você possa acessá-lo de qualquer lugar via internet com usuário e senha.

---

## Opção 1: Instalação Rápida com Docker (Recomendada) 🐳

Esta é a opção mais simples e isolada. Leva menos de 3 minutos.

### 1. Conecte-se ao seu servidor via SSH:
```bash
ssh usuario@ip_do_seu_servidor
```

### 2. Instale o Docker e o Docker Compose (se ainda não tiver):
```bash
# Ubuntu / Debian:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 3. Envie ou clone os arquivos do DevAgenda para o servidor:
```bash
# Exemplo clonando ou enviando para /opt/devagenda
mkdir -p /opt/devagenda
cd /opt/devagenda
# Copie a pasta do projeto para cá
```

### 4. Ajuste suas variáveis de ambiente:
Copie o `.env.example` para `.env`:
```bash
cp .env.example .env
nano .env
```
Altere `SECRET_KEY` para uma chave segura e defina uma senha forte em `INITIAL_ADMIN_PASSWORD`.

### 5. Inicie o sistema com Docker Compose:
```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Pronto! O sistema já estará rodando na porta `8000`. Acesse:
`http://SEU_IP_DO_SERVIDOR:8000`

---

## Opção 2: Instalação Nativa Linux (Python + Systemd + Nginx + SSL Grátis) 🚀

Se você prefere rodar direto no sistema operacional com Nginx e certificado HTTPS (cadeado verde):

### 1. Instale os pacotes básicos no servidor:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git
```

### 2. Configure o diretório da aplicação:
```bash
sudo mkdir -p /var/www/devagenda
sudo chown -R $USER:$USER /var/www/devagenda
cd /var/www/devagenda

# Copie os arquivos do DevAgenda para este diretório
```

### 3. Crie o ambiente virtual Python e instale as dependências:
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure o arquivo `.env`:
```bash
cp .env.example .env
nano .env
```
Gere uma chave secreta e configure suas senhas.

### 5. Configure o serviço contínuo (Systemd):
Copie o arquivo de serviço:
```bash
sudo cp deploy/agenda.service /etc/systemd/system/
sudo sed -i "s/User=www-data/User=$USER/g" /etc/systemd/system/agenda.service
sudo systemctl daemon-reload
sudo systemctl enable agenda
sudo systemctl start agenda
sudo systemctl status agenda
```
O serviço iniciará automaticamente mesmo se o servidor for reiniciado.

### 6. Configure o Nginx como Proxy Reverso:
Copie o arquivo de configuração do Nginx:
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/devagenda
sudo nano /etc/nginx/sites-available/devagenda
# Substitua 'agenda.seudominio.com' pelo seu domínio ou subdomínio
```

Ative o site no Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/devagenda /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Ative o Certificado SSL Gratuito (HTTPS) com Let's Encrypt:
Basta rodar o comando do Certbot:
```bash
sudo certbot --nginx -d agenda.seudominio.com
```
O Certbot configurará o HTTPS automaticamente com renovação automática periódica!

---

## Backup do Banco de Dados 💾

Como o DevAgenda utiliza o **SQLite**, todos os seus agendamentos, chamados e históricos ficam gravados em um **único arquivo** (`agenda.db`).

Para fazer backup:
```bash
# Copiar o banco para backup local ou na nuvem
cp /var/www/devagenda/agenda.db /backup/agenda_$(date +%Y%m%d).db
```

Para automatizar no `crontab`:
```bash
# Executar backup diário às 03:00 da madrugada
0 3 * * * cp /var/www/devagenda/agenda.db /var/backups/agenda_$(date +\%Y\%m\%d).db
```

---

## Portas de Firewall (UFW)
Se o firewall do seu servidor estiver ativado:
```bash
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000/tcp  # Porta direta (opcional se não usar Nginx)
sudo ufw status
```

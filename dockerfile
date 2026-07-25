# Dockerfile (Receita para o ambiente real)
FROM node:24-alpine

# Cria a pasta do app dentro do Linux do contêiner
WORKDIR /usr/src/app

# Copia os arquivos de dependências primeiro (otimiza o cache do Docker)
COPY package*.json ./

# Instala as dependências de forma limpa
RUN npm install --omit=dev

# Copia o resto dos arquivos do projeto (Models, Controllers, Views...)
COPY . .

# Expõe a porta que o Express está ouvindo
EXPOSE 3000

# Comando que inicia o servidor em produção
CMD ["node", "server.js"]

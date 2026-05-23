# FROM node:latest AS builder
# WORKDIR /

# ARG REACT_APP_API_URL
# ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# COPY package*.json ./
# RUN npm ci

# COPY . .
# RUN npm run build

# FROM nginx:latest

# RUN rm -rf /usr/share/nginx/html/*

# COPY --from=builder build/. /usr/share/nginx/html/

# COPY default.conf /etc/nginx/conf.d/default.conf

# # COPY nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]


FROM nginx:latest

RUN rm -rf /usr/share/nginx/html/*

COPY build/. /usr/share/nginx/html/

COPY default.conf /etc/nginx/conf.d/default.conf

# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

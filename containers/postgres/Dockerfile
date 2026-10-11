FROM postgres:16-alpine

# Install common extensions
RUN apk add --no-cache \
      postgresql-contrib \
      tzdata

ENV TZ=Asia/Kolkata

COPY conf/postgresql.conf /etc/postgresql/postgresql.conf
COPY init/ /docker-entrypoint-initdb.d/

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
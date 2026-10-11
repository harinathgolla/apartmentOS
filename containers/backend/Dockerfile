# ═══════════════════════════════════════════════════════════
# Stage 1 — build with Maven + JDK 21
# ═══════════════════════════════════════════════════════════
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache dependencies first
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Build
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ═══════════════════════════════════════════════════════════
# Stage 2 — runtime (small JRE image)
# ═══════════════════════════════════════════════════════════
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache tzdata curl && \
    addgroup -S spring && adduser -S spring -G spring && \
    cp /usr/share/zoneinfo/Asia/Kolkata /etc/localtime && \
    echo "Asia/Kolkata" > /etc/timezone

COPY --from=build /workspace/target/*.jar app.jar
RUN chown spring:spring app.jar
USER spring:spring

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseZGC", \
  "-XX:+ZGenerational", \
  "-Xms256m", "-Xmx768m", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

# --- Étape 1 : compilation du projet Spring Boot ---
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

COPY Biblioth/pom.xml ./
COPY Biblioth/src ./src

RUN mvn clean package -DskipTests

# --- Étape 2 : exécution de l'application ---
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY pom.xml ./pom.xml
COPY platform-core/pom.xml ./platform-core/pom.xml
COPY platform-core/src ./platform-core/src
RUN mvn -f platform-core/pom.xml install -DskipTests -q
COPY admin-service/pom.xml ./admin-service/pom.xml
COPY admin-service/src ./admin-service/src
RUN mvn -f admin-service/pom.xml package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /workspace/admin-service/target/*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]

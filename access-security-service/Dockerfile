FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY pom.xml ./pom.xml
COPY platform-core/pom.xml ./platform-core/pom.xml
COPY platform-core/src ./platform-core/src
RUN mvn -f platform-core/pom.xml install -DskipTests -q
COPY access-security-service/pom.xml ./access-security-service/pom.xml
COPY access-security-service/src ./access-security-service/src
RUN mvn -f access-security-service/pom.xml package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /workspace/access-security-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]

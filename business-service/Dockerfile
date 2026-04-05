FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY pom.xml ./pom.xml
COPY platform-core/pom.xml ./platform-core/pom.xml
COPY platform-core/src ./platform-core/src
RUN mvn -f platform-core/pom.xml install -DskipTests -q
COPY business-service/pom.xml ./business-service/pom.xml
COPY business-service/src ./business-service/src
RUN mvn -f business-service/pom.xml package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /workspace/business-service/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]

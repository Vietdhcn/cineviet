FROM maven:3.9.16-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S cineviet && adduser -S cineviet -G cineviet
WORKDIR /app
COPY --from=build /app/target/cineviet-backend-1.0.0.jar app.jar
USER cineviet
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

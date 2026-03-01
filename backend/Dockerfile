FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Copy prebuilt jar
COPY build/libs/clearixam-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

CMD ["sh", "-c", "java -Xmx512m -Xms256m -Dserver.port=$PORT -jar app.jar"]
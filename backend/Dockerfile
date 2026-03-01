FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Copy entire repository (including root gradle wrapper)
COPY . .

# Make root gradlew executable
RUN chmod +x ./gradlew

# Build only backend module (skip tests)
RUN ./gradlew :backend:clean :backend:build -x test

EXPOSE 8080

# Start application with dynamic port binding
CMD ["sh", "-c", "java -Xmx512m -Xms256m -Dserver.port=$PORT -jar backend/build/libs/clearixam-0.0.1-SNAPSHOT.jar"]
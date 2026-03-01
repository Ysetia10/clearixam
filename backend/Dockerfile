FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Copy the entire backend project
COPY . .

# Make gradlew executable
RUN chmod +x ./gradlew

# Build the application (skip tests for faster builds)
RUN ./gradlew clean build -x test

# Expose port 8080 (Render will override with $PORT)
EXPOSE 8080

# Start the application with memory limits and dynamic port
CMD ["sh", "-c", "java -Xmx512m -Xms256m -Dserver.port=$PORT -jar build/libs/clearixam-0.0.1-SNAPSHOT.jar"]

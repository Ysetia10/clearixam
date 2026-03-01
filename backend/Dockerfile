FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Copy entire repository including gradle wrapper
COPY . .

# Ensure gradle wrapper is executable
RUN chmod +x backend/gradlew

# Build backend (skip tests for faster deployment)
RUN cd backend && ./gradlew clean build -x test

# Expose port 8080 (Render will override with $PORT)
EXPOSE 8080

# Start the application with memory limits and dynamic port
CMD ["sh", "-c", "java -Xmx512m -Xms256m -Dserver.port=$PORT -jar backend/build/libs/clearixam-0.0.1-SNAPSHOT.jar"]

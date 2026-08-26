package com.clearixam.config

import org.springframework.boot.SpringApplication
import org.springframework.boot.env.EnvironmentPostProcessor
import org.springframework.core.env.ConfigurableEnvironment

class DatasourceUrlValidator : EnvironmentPostProcessor {

    override fun postProcessEnvironment(environment: ConfigurableEnvironment, application: SpringApplication) {
        val url = environment.getProperty("spring.datasource.url") ?: return
        val host = url.substringAfter("://").substringBefore("/").substringBefore(":")

        println("Clearixam datasource host: $host")

        if (host.startsWith("dpg-")) {
            throw IllegalStateException(
                "SPRING_DATASOURCE_URL still points at the old Render Postgres host ($host). " +
                    "Replace it with the Supabase Session pooler JDBC URL: " +
                    "jdbc:postgresql://aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require " +
                    "and set SPRING_DATASOURCE_USERNAME=postgres.bfrekneojaimvghyolql"
            )
        }
    }
}

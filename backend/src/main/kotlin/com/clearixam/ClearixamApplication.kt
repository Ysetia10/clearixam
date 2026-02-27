package com.clearixam

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ClearixamApplication

fun main(args: Array<String>) {
    runApplication<ClearixamApplication>(*args)
}

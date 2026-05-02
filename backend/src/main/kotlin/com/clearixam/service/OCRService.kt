package com.clearixam.service

import net.sourceforge.tess4j.Tesseract
import net.sourceforge.tess4j.TesseractException
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO

@Service
class OCRService {
    
    private val logger = LoggerFactory.getLogger(OCRService::class.java)
    private val tesseract: Tesseract = Tesseract()
    
    init {
        try {
            tesseract.setDatapath("/usr/share/tesseract-ocr/4.00/tessdata")
            tesseract.setLanguage("eng")
            tesseract.setPageSegMode(1)
            tesseract.setOcrEngineMode(1)
            logger.info("Tesseract OCR initialized successfully")
        } catch (e: Exception) {
            logger.warn("Tesseract initialization failed, will attempt runtime configuration: ${e.message}")
        }
    }
    
    fun extractText(image: MultipartFile): String {
        return try {
            logger.info("Starting OCR extraction for image: ${image.originalFilename}")
            
            if (image.isEmpty) {
                logger.warn("Empty image file provided")
                return ""
            }
            
            if (!isValidImageType(image)) {
                logger.warn("Invalid image type: ${image.contentType}")
                return ""
            }
            
            val bufferedImage: BufferedImage = ByteArrayInputStream(image.bytes).use { inputStream ->
                ImageIO.read(inputStream) ?: throw IllegalArgumentException("Could not read image")
            }
            
            val extractedText = tesseract.doOCR(bufferedImage)
            
            logger.info("OCR extraction completed. Text length: ${extractedText.length}")
            logger.debug("Extracted text preview: ${extractedText.take(100)}...")
            
            extractedText.trim()
            
        } catch (e: TesseractException) {
            logger.error("Tesseract OCR failed: ${e.message}", e)
            ""
        } catch (e: Exception) {
            logger.error("OCR extraction failed: ${e.message}", e)
            ""
        }
    }
    
    private fun isValidImageType(file: MultipartFile): Boolean {
        val supportedTypes = setOf(
            "image/jpeg", "image/jpg", "image/png", 
            "image/bmp", "image/tiff", "image/gif"
        )
        return file.contentType in supportedTypes
    }
    
    fun getOCRInfo(): Map<String, String> {
        return try {
            mapOf(
                "engine" to "Tesseract OCR",
                "status" to "initialized",
                "language" to "eng"
            )
        } catch (e: Exception) {
            mapOf("error" to "Could not retrieve OCR info: ${e.message}")
        }
    }
}
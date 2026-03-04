package com.clearixam.service

import com.clearixam.dto.request.ImportBackupRequest
import com.clearixam.dto.response.*
import com.clearixam.repository.GoalRepository
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.SubjectScoreRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class BackupService(
    private val mockTestRepository: MockTestRepository,
    private val subjectScoreRepository: SubjectScoreRepository,
    private val goalRepository: GoalRepository,
    private val userRepository: UserRepository
) {
    
    fun exportUserData(userEmail: String): BackupDataResponse {
        // TODO: Implement with new multi-exam system
        throw UnsupportedOperationException("This endpoint will be updated to support multi-exam system")
    }
    
    @Transactional
    fun importUserData(userEmail: String, request: ImportBackupRequest) {
        // TODO: Implement with new multi-exam system
        throw UnsupportedOperationException("This endpoint will be updated to support multi-exam system")
    }
}

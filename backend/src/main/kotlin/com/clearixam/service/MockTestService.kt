package com.clearixam.service

import com.clearixam.dto.request.CreateMockRequest
import com.clearixam.dto.response.MockDetailResponse
import com.clearixam.dto.response.MockResponse
import com.clearixam.dto.response.PagedMockResponse
import com.clearixam.repository.MockTestRepository
import com.clearixam.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class MockTestService(
    private val mockTestRepository: MockTestRepository,
    private val userRepository: UserRepository
) {

    @Transactional
    fun createMock(userEmail: String, request: CreateMockRequest): MockResponse {
        // TODO: Implement with new multi-exam system
        throw UnsupportedOperationException("This endpoint will be updated to support multi-exam system")
    }

    @Transactional(readOnly = true)
    fun getMocksForUser(userEmail: String, page: Int = 0, size: Int = 10): PagedMockResponse {
        // TODO: Implement with new multi-exam system
        throw UnsupportedOperationException("This endpoint will be updated to support multi-exam system")
    }

    @Transactional(readOnly = true)
    fun getMockDetail(mockId: UUID, userEmail: String): MockDetailResponse {
        // TODO: Implement with new multi-exam system
        throw UnsupportedOperationException("This endpoint will be updated to support multi-exam system")
    }

    @Transactional
    fun deleteMock(mockId: UUID, userEmail: String) {
        // TODO: Implement with new multi-exam system
        throw UnsupportedOperationException("This endpoint will be updated to support multi-exam system")
    }
}

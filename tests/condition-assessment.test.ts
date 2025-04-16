import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
// In a real environment, you would use a Clarity testing framework

// Mock contract state
const contractOwner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const assessments = new Map()
const authorizedAssessors = new Map()

// Mock contract functions
function addAssessor(sender: string, assessor: string) {
  if (sender !== contractOwner) {
    return { error: 100 } // ERR-NOT-AUTHORIZED
  }
  
  authorizedAssessors.set(assessor, { isAuthorized: true })
  return { success: true }
}

function createAssessment(
    sender: string,
    propertyId: string,
    assessmentId: string,
    assessmentType: string,
    conditionScore: number,
    damagesReported: boolean,
    notesHash: string,
) {
  const assessorStatus = authorizedAssessors.get(sender)
  if (!assessorStatus || !assessorStatus.isAuthorized) {
    return { error: 100 } // ERR-NOT-AUTHORIZED
  }
  
  if (assessmentType !== "move-in" && assessmentType !== "move-out") {
    return { error: 102 } // ERR-INVALID-ASSESSMENT-TYPE
  }
  
  const key = `${propertyId}-${assessmentId}`
  assessments.set(key, {
    assessor: sender,
    assessmentType,
    conditionScore,
    damagesReported,
    notesHash,
    timestamp: 123, // Mock block height
  })
  
  return { success: true }
}

function getAssessmentDetails(propertyId: string, assessmentId: string) {
  const key = `${propertyId}-${assessmentId}`
  const assessment = assessments.get(key)
  if (!assessment) {
    return { error: 101 } // ERR-ASSESSMENT-NOT-FOUND
  }
  
  return { success: assessment }
}

function compareAssessments(propertyId: string, moveInId: string, moveOutId: string) {
  const moveInKey = `${propertyId}-${moveInId}`
  const moveOutKey = `${propertyId}-${moveOutId}`
  
  const moveIn = assessments.get(moveInKey)
  const moveOut = assessments.get(moveOutKey)
  
  if (!moveIn || !moveOut) {
    return { error: 101 } // ERR-ASSESSMENT-NOT-FOUND
  }
  
  if (moveIn.assessmentType !== "move-in" || moveOut.assessmentType !== "move-out") {
    return { error: 102 } // ERR-INVALID-ASSESSMENT-TYPE
  }
  
  return {
    success: {
      conditionChange: moveIn.conditionScore - moveOut.conditionScore,
      damagesReported: moveOut.damagesReported,
    },
  }
}

// Tests
describe("Condition Assessment Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    assessments.clear()
    authorizedAssessors.clear()
  })
  
  it("should add an assessor successfully", () => {
    const assessor = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = addAssessor(contractOwner, assessor)
    expect(result.success).toBe(true)
    
    const assessorStatus = authorizedAssessors.get(assessor)
    expect(assessorStatus).toBeDefined()
    expect(assessorStatus.isAuthorized).toBe(true)
  })
  
  it("should fail to add assessor if not contract owner", () => {
    const result = addAssessor("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    expect(result.error).toBe(100) // ERR-NOT-AUTHORIZED
  })
  
  it("should create an assessment successfully", () => {
    // Setup
    const assessor = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    addAssessor(contractOwner, assessor)
    
    // Test
    const result = createAssessment(
        assessor,
        "property123",
        "assessment123",
        "move-in",
        95,
        false,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )
    expect(result.success).toBe(true)
    
    const assessmentDetails = getAssessmentDetails("property123", "assessment123")
    expect(assessmentDetails.success).toBeDefined()
    expect(assessmentDetails.success.assessmentType).toBe("move-in")
    expect(assessmentDetails.success.conditionScore).toBe(95)
  })
  
  it("should fail to create assessment with invalid type", () => {
    // Setup
    const assessor = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    addAssessor(contractOwner, assessor)
    
    // Test
    const result = createAssessment(
        assessor,
        "property123",
        "assessment123",
        "invalid", // Invalid type
        95,
        false,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )
    expect(result.error).toBe(102) // ERR-INVALID-ASSESSMENT-TYPE
  })
  
  it("should compare move-in and move-out assessments", () => {
    // Setup
    const assessor = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    addAssessor(contractOwner, assessor)
    
    // Create move-in assessment
    createAssessment(
        assessor,
        "property123",
        "move-in-123",
        "move-in",
        95,
        false,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )
    
    // Create move-out assessment
    createAssessment(
        assessor,
        "property123",
        "move-out-123",
        "move-out",
        85,
        true,
        "0x9876543210abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )
    
    // Test
    const result = compareAssessments("property123", "move-in-123", "move-out-123")
    expect(result.success).toBeDefined()
    expect(result.success.conditionChange).toBe(10) // 95 - 85
    expect(result.success.damagesReported).toBe(true)
  })
})

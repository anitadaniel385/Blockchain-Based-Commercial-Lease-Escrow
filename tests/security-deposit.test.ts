import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
// In a real environment, you would use a Clarity testing framework

// Mock contract state
const contractOwner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const deposits = new Map()
const balances = new Map()

// Initialize some balances for testing
function initializeBalances() {
  balances.set("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 10000)
  balances.set("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 10000)
  balances.set("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 10000)
  balances.set("CONTRACT", 0)
}

// Mock contract functions
function createDeposit(sender: string, leaseId: string, landlord: string, amount: number) {
  const senderBalance = balances.get(sender) || 0
  
  if (senderBalance < amount) {
    return { error: 102 } // ERR-INSUFFICIENT-FUNDS
  }
  
  // Transfer funds to contract
  balances.set(sender, senderBalance - amount)
  balances.set("CONTRACT", (balances.get("CONTRACT") || 0) + amount)
  
  deposits.set(leaseId, {
    tenant: sender,
    landlord,
    amount,
    status: "held",
    depositDate: 123, // Mock block height
    releaseDate: 0,
  })
  
  return { success: true }
}

function releaseToLandlord(sender: string, leaseId: string) {
  const deposit = deposits.get(leaseId)
  if (!deposit) {
    return { error: 101 } // ERR-DEPOSIT-NOT-FOUND
  }
  
  if (sender !== deposit.tenant) {
    return { error: 100 } // ERR-NOT-AUTHORIZED
  }
  
  if (deposit.status !== "held") {
    return { error: 103 } // ERR-INVALID-STATUS
  }
  
  // Transfer funds from contract to landlord
  const contractBalance = balances.get("CONTRACT") || 0
  const landlordBalance = balances.get(deposit.landlord) || 0
  
  balances.set("CONTRACT", contractBalance - deposit.amount)
  balances.set(deposit.landlord, landlordBalance + deposit.amount)
  
  deposits.set(leaseId, {
    ...deposit,
    status: "released",
    releaseDate: 456, // Mock block height
  })
  
  return { success: true }
}

function returnToTenant(sender: string, leaseId: string) {
  const deposit = deposits.get(leaseId)
  if (!deposit) {
    return { error: 101 } // ERR-DEPOSIT-NOT-FOUND
  }
  
  if (sender !== deposit.landlord) {
    return { error: 100 } // ERR-NOT-AUTHORIZED
  }
  
  if (deposit.status !== "held") {
    return { error: 103 } // ERR-INVALID-STATUS
  }
  
  // Transfer funds from contract to tenant
  const contractBalance = balances.get("CONTRACT") || 0
  const tenantBalance = balances.get(deposit.tenant) || 0
  
  balances.set("CONTRACT", contractBalance - deposit.amount)
  balances.set(deposit.tenant, tenantBalance + deposit.amount)
  
  deposits.set(leaseId, {
    ...deposit,
    status: "released",
    releaseDate: 456, // Mock block height
  })
  
  return { success: true }
}

function disputeDeposit(sender: string, leaseId: string) {
  const deposit = deposits.get(leaseId)
  if (!deposit) {
    return { error: 101 } // ERR-DEPOSIT-NOT-FOUND
  }
  
  if (sender !== deposit.tenant && sender !== deposit.landlord) {
    return { error: 100 } // ERR-NOT-AUTHORIZED
  }
  
  if (deposit.status !== "held") {
    return { error: 103 } // ERR-INVALID-STATUS
  }
  
  deposits.set(leaseId, {
    ...deposit,
    status: "disputed",
    releaseDate: 0,
  })
  
  return { success: true }
}

function getDepositDetails(leaseId: string) {
  const deposit = deposits.get(leaseId)
  if (!deposit) {
    return { error: 101 } // ERR-DEPOSIT-NOT-FOUND
  }
  
  return { success: deposit }
}

// Tests
describe("Security Deposit Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    deposits.clear()
    balances.clear()
    initializeBalances()
  })
  
  it("should create a deposit successfully", () => {
    const tenant = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const landlord = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const amount = 1000
    
    const result = createDeposit(tenant, "lease123", landlord, amount)
    expect(result.success).toBe(true)
    
    const depositDetails = getDepositDetails("lease123")
    expect(depositDetails.success).toBeDefined()
    expect(depositDetails.success.status).toBe("held")
    expect(depositDetails.success.amount).toBe(amount)
    
    // Check balances
    expect(balances.get(tenant)).toBe(9000)
    expect(balances.get("CONTRACT")).toBe(1000)
  })
  
  it("should fail to create deposit with insufficient funds", () => {
    const tenant = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const landlord = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const amount = 20000 // More than balance
    
    const result = createDeposit(tenant, "lease123", landlord, amount)
    expect(result.error).toBe(102) // ERR-INSUFFICIENT-FUNDS
  })
  
  it("should release deposit to landlord", () => {
    // Setup
    const tenant = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const landlord = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const amount = 1000
    createDeposit(tenant, "lease123", landlord, amount)
    
    // Test
    const result = releaseToLandlord(tenant, "lease123")
    expect(result.success).toBe(true)
    
    const depositDetails = getDepositDetails("lease123")
    expect(depositDetails.success.status).toBe("released")
    
    // Check balances
    expect(balances.get("CONTRACT")).toBe(0)
    expect(balances.get(landlord)).toBe(11000)
  })
  
  it("should return deposit to tenant", () => {
    // Setup
    const tenant = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const landlord = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const amount = 1000
    createDeposit(tenant, "lease123", landlord, amount)
    
    // Test
    const result = returnToTenant(landlord, "lease123")
    expect(result.success).toBe(true)
    
    const depositDetails = getDepositDetails("lease123")
    expect(depositDetails.success.status).toBe("released")
    
    // Check balances
    expect(balances.get("CONTRACT")).toBe(0)
    expect(balances.get(tenant)).toBe(10000) // Back to original balance
  })
  
  it("should mark deposit as disputed", () => {
    // Setup
    const tenant = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const landlord = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const amount = 1000
    createDeposit(tenant, "lease123", landlord, amount)
    
    // Test
    const result = disputeDeposit(tenant, "lease123")
    expect(result.success).toBe(true)
    
    const depositDetails = getDepositDetails("lease123")
    expect(depositDetails.success.status).toBe("disputed")
    
    // Funds should still be in contract
    expect(balances.get("CONTRACT")).toBe(1000)
  })
  
  it("should fail to release deposit if not tenant", () => {
    // Setup
    const tenant = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const landlord = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const amount = 1000
    createDeposit(tenant, "lease123", landlord, amount)
    
    // Test with wrong sender
    const result = releaseToLandlord(landlord, "lease123")
    expect(result.error).toBe(100) // ERR-NOT-AUTHORIZED
  })
})

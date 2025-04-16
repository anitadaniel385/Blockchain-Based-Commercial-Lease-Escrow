;; Tenant Verification Contract
;; Confirms financial qualifications of tenants

(define-data-var contract-owner principal tx-sender)

;; Tenant data structure
(define-map tenants
  { tenant-id: (string-ascii 36) }
  {
    address: principal,
    credit-score: uint,
    income-verified: bool,
    verified: bool,
    last-verified-at: uint
  }
)

;; Verifiers authorized to validate tenants
(define-map authorized-verifiers
  { verifier: principal }
  { is-authorized: bool }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-TENANT-NOT-FOUND u101)
(define-constant ERR-ALREADY-VERIFIED u102)

;; Register a new tenant
(define-public (register-tenant (tenant-id (string-ascii 36)))
  (begin
    (map-insert tenants
      { tenant-id: tenant-id }
      {
        address: tx-sender,
        credit-score: u0,
        income-verified: false,
        verified: false,
        last-verified-at: u0
      }
    )
    (ok true)
  )
)

;; Add a verifier
(define-public (add-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (map-insert authorized-verifiers
      { verifier: verifier }
      { is-authorized: true }
    )
    (ok true)
  )
)

;; Verify a tenant's financial qualifications
(define-public (verify-tenant (tenant-id (string-ascii 36)) (credit-score uint) (income-verified bool))
  (let (
    (tenant (unwrap! (map-get? tenants { tenant-id: tenant-id }) (err ERR-TENANT-NOT-FOUND)))
    (verifier-status (unwrap! (map-get? authorized-verifiers { verifier: tx-sender }) (err ERR-NOT-AUTHORIZED)))
  )
    (asserts! (get is-authorized verifier-status) (err ERR-NOT-AUTHORIZED))
    (map-set tenants
      { tenant-id: tenant-id }
      {
        address: (get address tenant),
        credit-score: credit-score,
        income-verified: income-verified,
        verified: true,
        last-verified-at: block-height
      }
    )
    (ok true)
  )
)

;; Check if a tenant is verified
(define-read-only (is-tenant-verified (tenant-id (string-ascii 36)))
  (let ((tenant (map-get? tenants { tenant-id: tenant-id })))
    (if (is-some tenant)
      (ok (get verified (unwrap! tenant (err ERR-TENANT-NOT-FOUND))))
      (err ERR-TENANT-NOT-FOUND)
    )
  )
)

;; Get tenant details
(define-read-only (get-tenant-details (tenant-id (string-ascii 36)))
  (let ((tenant (map-get? tenants { tenant-id: tenant-id })))
    (if (is-some tenant)
      (ok (unwrap! tenant (err ERR-TENANT-NOT-FOUND)))
      (err ERR-TENANT-NOT-FOUND)
    )
  )
)

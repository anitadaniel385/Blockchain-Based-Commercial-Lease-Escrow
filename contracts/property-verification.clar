;; Property Verification Contract
;; Validates ownership and condition of a property

(define-data-var contract-owner principal tx-sender)

;; Property data structure
(define-map properties
  { property-id: (string-ascii 36) }
  {
    owner: principal,
    verified: bool,
    condition-score: uint,
    last-verified-at: uint
  }
)

;; Verifiers authorized to validate properties
(define-map authorized-verifiers
  { verifier: principal }
  { is-authorized: bool }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-PROPERTY-NOT-FOUND u101)
(define-constant ERR-ALREADY-VERIFIED u102)

;; Add a new property
(define-public (register-property (property-id (string-ascii 36)))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (map-insert properties
      { property-id: property-id }
      {
        owner: tx-sender,
        verified: false,
        condition-score: u0,
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

;; Verify a property
(define-public (verify-property (property-id (string-ascii 36)) (condition-score uint))
  (let (
    (property (unwrap! (map-get? properties { property-id: property-id }) (err ERR-PROPERTY-NOT-FOUND)))
    (verifier-status (unwrap! (map-get? authorized-verifiers { verifier: tx-sender }) (err ERR-NOT-AUTHORIZED)))
  )
    (asserts! (get is-authorized verifier-status) (err ERR-NOT-AUTHORIZED))
    (map-set properties
      { property-id: property-id }
      {
        owner: (get owner property),
        verified: true,
        condition-score: condition-score,
        last-verified-at: block-height
      }
    )
    (ok true)
  )
)

;; Check if a property is verified
(define-read-only (is-property-verified (property-id (string-ascii 36)))
  (let ((property (map-get? properties { property-id: property-id })))
    (if (is-some property)
      (ok (get verified (unwrap! property (err ERR-PROPERTY-NOT-FOUND))))
      (err ERR-PROPERTY-NOT-FOUND)
    )
  )
)

;; Get property details
(define-read-only (get-property-details (property-id (string-ascii 36)))
  (let ((property (map-get? properties { property-id: property-id })))
    (if (is-some property)
      (ok (unwrap! property (err ERR-PROPERTY-NOT-FOUND)))
      (err ERR-PROPERTY-NOT-FOUND)
    )
  )
)

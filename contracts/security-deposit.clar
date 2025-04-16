;; Security Deposit Contract
;; Manages funds held during lease term

(define-data-var contract-owner principal tx-sender)

;; Deposit data structure
(define-map deposits
  { lease-id: (string-ascii 36) }
  {
    tenant: principal,
    landlord: principal,
    amount: uint,
    status: (string-ascii 20), ;; "held", "released", "disputed"
    deposit-date: uint,
    release-date: uint
  }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-DEPOSIT-NOT-FOUND u101)
(define-constant ERR-INSUFFICIENT-FUNDS u102)
(define-constant ERR-INVALID-STATUS u103)

;; Create a new security deposit
(define-public (create-deposit (lease-id (string-ascii 36)) (landlord principal) (amount uint))
  (begin
    (asserts! (>= (stx-get-balance tx-sender) amount) (err ERR-INSUFFICIENT-FUNDS))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-insert deposits
      { lease-id: lease-id }
      {
        tenant: tx-sender,
        landlord: landlord,
        amount: amount,
        status: "held",
        deposit-date: block-height,
        release-date: u0
      }
    )
    (ok true)
  )
)

;; Release deposit to landlord (by tenant)
(define-public (release-to-landlord (lease-id (string-ascii 36)))
  (let (
    (deposit (unwrap! (map-get? deposits { lease-id: lease-id }) (err ERR-DEPOSIT-NOT-FOUND)))
  )
    (asserts! (is-eq tx-sender (get tenant deposit)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status deposit) "held") (err ERR-INVALID-STATUS))

    (try! (as-contract (stx-transfer? (get amount deposit) tx-sender (get landlord deposit))))

    (map-set deposits
      { lease-id: lease-id }
      {
        tenant: (get tenant deposit),
        landlord: (get landlord deposit),
        amount: (get amount deposit),
        status: "released",
        deposit-date: (get deposit-date deposit),
        release-date: block-height
      }
    )
    (ok true)
  )
)

;; Return deposit to tenant (by landlord)
(define-public (return-to-tenant (lease-id (string-ascii 36)))
  (let (
    (deposit (unwrap! (map-get? deposits { lease-id: lease-id }) (err ERR-DEPOSIT-NOT-FOUND)))
  )
    (asserts! (is-eq tx-sender (get landlord deposit)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status deposit) "held") (err ERR-INVALID-STATUS))

    (try! (as-contract (stx-transfer? (get amount deposit) tx-sender (get tenant deposit))))

    (map-set deposits
      { lease-id: lease-id }
      {
        tenant: (get tenant deposit),
        landlord: (get landlord deposit),
        amount: (get amount deposit),
        status: "released",
        deposit-date: (get deposit-date deposit),
        release-date: block-height
      }
    )
    (ok true)
  )
)

;; Mark deposit as disputed
(define-public (dispute-deposit (lease-id (string-ascii 36)))
  (let (
    (deposit (unwrap! (map-get? deposits { lease-id: lease-id }) (err ERR-DEPOSIT-NOT-FOUND)))
  )
    (asserts! (or (is-eq tx-sender (get tenant deposit)) (is-eq tx-sender (get landlord deposit))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status deposit) "held") (err ERR-INVALID-STATUS))

    (map-set deposits
      { lease-id: lease-id }
      {
        tenant: (get tenant deposit),
        landlord: (get landlord deposit),
        amount: (get amount deposit),
        status: "disputed",
        deposit-date: (get deposit-date deposit),
        release-date: u0
      }
    )
    (ok true)
  )
)

;; Get deposit details
(define-read-only (get-deposit-details (lease-id (string-ascii 36)))
  (let ((deposit (map-get? deposits { lease-id: lease-id })))
    (if (is-some deposit)
      (ok (unwrap! deposit (err ERR-DEPOSIT-NOT-FOUND)))
      (err ERR-DEPOSIT-NOT-FOUND)
    )
  )
)

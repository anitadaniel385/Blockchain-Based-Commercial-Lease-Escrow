;; Condition Assessment Contract
;; Documents property state at move-in/out

(define-data-var contract-owner principal tx-sender)

;; Assessment data structure
(define-map assessments
  { property-id: (string-ascii 36), assessment-id: (string-ascii 36) }
  {
    assessor: principal,
    assessment-type: (string-ascii 10), ;; "move-in" or "move-out"
    condition-score: uint,
    damages-reported: bool,
    notes-hash: (buff 32), ;; Hash of detailed assessment notes
    timestamp: uint
  }
)

;; Assessors authorized to document property conditions
(define-map authorized-assessors
  { assessor: principal }
  { is-authorized: bool }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ASSESSMENT-NOT-FOUND u101)
(define-constant ERR-INVALID-ASSESSMENT-TYPE u102)

;; Add an assessor
(define-public (add-assessor (assessor principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (map-insert authorized-assessors
      { assessor: assessor }
      { is-authorized: true }
    )
    (ok true)
  )
)

;; Create a property assessment
(define-public (create-assessment
  (property-id (string-ascii 36))
  (assessment-id (string-ascii 36))
  (assessment-type (string-ascii 10))
  (condition-score uint)
  (damages-reported bool)
  (notes-hash (buff 32))
)
  (let (
    (assessor-status (unwrap! (map-get? authorized-assessors { assessor: tx-sender }) (err ERR-NOT-AUTHORIZED)))
  )
    (asserts! (get is-authorized assessor-status) (err ERR-NOT-AUTHORIZED))
    (asserts! (or (is-eq assessment-type "move-in") (is-eq assessment-type "move-out")) (err ERR-INVALID-ASSESSMENT-TYPE))

    (map-insert assessments
      { property-id: property-id, assessment-id: assessment-id }
      {
        assessor: tx-sender,
        assessment-type: assessment-type,
        condition-score: condition-score,
        damages-reported: damages-reported,
        notes-hash: notes-hash,
        timestamp: block-height
      }
    )
    (ok true)
  )
)

;; Get assessment details
(define-read-only (get-assessment-details (property-id (string-ascii 36)) (assessment-id (string-ascii 36)))
  (let ((assessment (map-get? assessments { property-id: property-id, assessment-id: assessment-id })))
    (if (is-some assessment)
      (ok (unwrap! assessment (err ERR-ASSESSMENT-NOT-FOUND)))
      (err ERR-ASSESSMENT-NOT-FOUND)
    )
  )
)

;; Compare move-in and move-out assessments
(define-read-only (compare-assessments
  (property-id (string-ascii 36))
  (move-in-id (string-ascii 36))
  (move-out-id (string-ascii 36))
)
  (let (
    (move-in (unwrap! (map-get? assessments { property-id: property-id, assessment-id: move-in-id }) (err ERR-ASSESSMENT-NOT-FOUND)))
    (move-out (unwrap! (map-get? assessments { property-id: property-id, assessment-id: move-out-id }) (err ERR-ASSESSMENT-NOT-FOUND)))
  )
    (asserts! (is-eq (get assessment-type move-in) "move-in") (err ERR-INVALID-ASSESSMENT-TYPE))
    (asserts! (is-eq (get assessment-type move-out) "move-out") (err ERR-INVALID-ASSESSMENT-TYPE))

    (ok {
      condition-change: (- (get condition-score move-in) (get condition-score move-out)),
      damages-reported: (get damages-reported move-out)
    })
  )
)

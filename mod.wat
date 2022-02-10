(module
  (import "env" "memory" (memory $mem 1))

  (func $is_ascii
    (param i32)
    (result i32)
    (local i32)

    ;; Check if byte is higher than 31
    local.get 0
    i32.const 31
    i32.gt_u

    ;; Check if byte is lower than 127
    local.get 1
    i32.const 127
    i32.lt_u

    ;; Check if both are true and return
    i32.eq
  )
  
  (func $to_camel
    (export "toCamel")
    (param $ptr i32)
    (param $length i32)
    (param $write_ptr i32)
    (result i32)
    (local $return_length i32)
    (local $i i32)
    (local $current_byte i32)

    (block
      (loop
        ;; Break if length is reached
        local.get $i
        local.get $length
        i32.ge_u
        br_if 1

        ;; Set current byte
        local.get $i
        local.get $ptr
        i32.add
        i32.load8_u
        local.tee $current_byte

        ;; Check if in ascii range otherwise ignore
        call $is_ascii
        (if
          (then
          
            local.get $current_byte
            i32.const 95
            i32.eq
            (if 
              (then
                ;; move to next ptr
                local.get $i
                local.get $ptr
                i32.add
                i32.const 1
                i32.add
                local.tee $i

                ;; Make byte uppercase
                i32.load8_u
                i32.const -32
                i32.add
                local.set $current_byte
              )
            )

            ;; Store potentially modified byte in memory
            local.get $write_ptr
            local.get $return_length
            i32.add
            local.get $current_byte
            i32.store8

            local.get $return_length
            i32.const 1
            i32.add
            local.set $return_length
          )
          (else unreachable)
        )

        ;; i++
        local.get $i
        i32.const 1
        i32.add
        local.set $i

        br 0
      )
    )

    local.get $return_length
  )
)

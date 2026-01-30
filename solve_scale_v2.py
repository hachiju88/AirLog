
import struct

# Raw hex strings from logs
hex_728 = "9275416a58a0a02ca0a00db9"
target_728 = 72.8

hex_546 = "9275416a58a0202c75a20db0"
target_546 = 54.6

# Hex from "ghost" log which might be noise or invalid, but worth checking
hex_noise = "9275416a58a0a0a0a0a206a8" 

bytes_728 = bytes.fromhex(hex_728)
bytes_546 = bytes.fromhex(hex_546)

factors = [0.01, 0.005, 0.02, 0.05, 0.1, 1.0, 0.001]

print(f"Brute-forcing common logic for:")
print(f"1. {hex_728} -> {target_728}")
print(f"2. {hex_546} -> {target_546}")

def check_val(val, target, desc):
    for f in factors:
        if abs(val * f - target) < 0.2:
            return f, desc
    return None, None

found = False

# 1. Plain & Masked
for i in range(min(len(bytes_728), len(bytes_546)) - 1):
    # LE
    val1 = struct.unpack_from('<H', bytes_728, i)[0]
    val2 = struct.unpack_from('<H', bytes_546, i)[0]
    
    # Check masks
    masks = [0xFFFF, 0x7FFF, 0x3FFF, 0xFFF]
    
    for m in masks:
        v1 = val1 & m
        v2 = val2 & m
        
        f1, d1 = check_val(v1, target_728, "")
        f2, d2 = check_val(v2, target_546, "")
        
        if f1 and f2 and f1 == f2:
            print(f"MATCH! Offset {i} Mask {hex(m)} Factor {f1}")
            print(f"  72.8: {v1} -> {v1*f1:.2f}")
            print(f"  54.6: {v2} -> {v2*f2:.2f}")
            found = True

# 2. XOR Scan (Single Key)
for key in range(256):
    xor_bytes_728 = bytes([b ^ key for b in bytes_728])
    xor_bytes_546 = bytes([b ^ key for b in bytes_546])
    
    for i in range(min(len(bytes_728), len(bytes_546)) - 1):
        v1 = struct.unpack_from('<H', xor_bytes_728, i)[0]
        v2 = struct.unpack_from('<H', xor_bytes_546, i)[0]
        
        for m in [0xFFFF, 0x7FFF]:
            vv1 = v1 & m
            vv2 = v2 & m
            
            f1, d1 = check_val(vv1, target_728, "")
            f2, d2 = check_val(vv2, target_546, "")
            
            if f1 and f2 and f1 == f2:
                print(f"MATCH! XOR {hex(key)} Offset {i} Mask {hex(m)} Factor {f1}")
                print(f"  72.8: {vv1} -> {vv1*f1:.2f}")
                print(f"  54.6: {vv2} -> {vv2*f2:.2f}")
                found = True

if not found:
    print("No common logic found (simple unit/xor).")


import struct

hex_728 = "9275416a58a0a02ca0a00db9"
target_728 = 72.8

hex_546 = "9275416a58a0202c75a20db0"
target_546 = 54.6

bytes_728 = bytes.fromhex(hex_728)
bytes_546 = bytes.fromhex(hex_546)

factors = [0.01, 0.005]

print("Searching with dynamic keys...")

def attempt(b_arr, target, desc):
    for i in range(len(b_arr)):
        # Try using each byte as key
        key = b_arr[i]
        
        # Try XORing other bytes with this key
        xor_arr = bytes([b ^ key for b in b_arr])
        
        for j in range(len(xor_arr)-1):
            val = struct.unpack_from('<H', xor_arr, j)[0]
            for m in [0xFFFF, 0x7FFF]:
                masked = val & m
                for f in factors:
                    if abs(masked * f - target) < 0.2:
                        return f"Key=Byte[{i}]({hex(key)}) Off={j} Mask={hex(m)} Factor={f} Val={masked}"
    return None

res1 = attempt(bytes_728, target_728, "72.8")
res2 = attempt(bytes_546, target_546, "54.6")

print(f"72.8 Result: {res1}")
print(f"54.6 Result: {res2}")

if res1 and res2:
    print("Potential match found!")
else:
    print("No dynamic key match.")

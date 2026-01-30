
import struct

samples = [
    {"hex": "9275416a58a0a02ca0a00db9", "val": 72.8, "desc": "Self (Old)"},
    {"hex": "9275416a58a0202c75a20db0", "val": 54.6, "desc": "Light Person"},
    {"hex": "9275416a58a0a2b1a0a206bb", "val": 73.0, "desc": "Self (New)"}
]

print("Solving for 3 samples...")

def get_int16(b, off, le=True):
    if off + 2 > len(b): return 0
    fmt = '<H' if le else '>H'
    return struct.unpack_from(fmt, b, off)[0]

def get_int24(b, off, le=True):
    if off + 3 > len(b): return 0
    if le: return b[off] | (b[off+1] << 8) | (b[off+2] << 16)
    else: return (b[off] << 16) | (b[off+1] << 8) | b[off+2]

def check(val1, val2, val3, desc):
    # Check simple ratio y = mx
    if val1 == 0: return # Avoid div0
    factor = 72.8 / val1
    
    # Allow 1% tolerance
    est2 = val2 * factor
    est3 = val3 * factor
    
    if abs(est2 - 54.6) < 0.5 and abs(est3 - 73.0) < 0.5:
        print(f"MATCH LINEAR! {desc} * {factor:.5f}")
        print(f"  72.8 -> {val1} -> {val1*factor:.2f}")
        print(f"  54.6 -> {val2} -> {val2*factor:.2f}")
        print(f"  73.0 -> {val3} -> {val3*factor:.2f}")
        return True

    # Check Inverse
    if val1 != 0:
        factor = 72.8 * val1 # If val = 1/weight
        # Unlikely for scale
    
    # Check y = mx + c (Linear Regression)
    # y1 = m*x1 + c
    # y2 = m*x2 + c
    # m = (y1-y2)/(x1-x2)
    if (val1 - val2) != 0:
        m = (72.8 - 54.6) / (val1 - val2)
        c = 72.8 - m * val1
        
        est3 = m * val3 + c
        if abs(est3 - 73.0) < 0.2:
             print(f"MATCH AFFINE! {desc}: W = {m:.5f}*Val + {c:.2f}")
             print(f"  72.8: {val1} -> {m*val1+c:.2f}")
             print(f"  54.6: {val2} -> {m*val2+c:.2f}")
             print(f"  73.0: {val3} -> {m*val3+c:.2f}")
             return True
    return False

# Scan offsets 0 to 12
for off in range(10):
    b1 = bytes.fromhex(samples[0]["hex"])
    b2 = bytes.fromhex(samples[1]["hex"])
    b3 = bytes.fromhex(samples[2]["hex"])
    
    # Try 16-bit
    check(get_int16(b1, off, True), get_int16(b2, off, True), get_int16(b3, off, True), f"Off{off}_LE16")
    check(get_int16(b1, off, False), get_int16(b2, off, False), get_int16(b3, off, False), f"Off{off}_BE16")

    # Try 24-bit
    check(get_int24(b1, off, True), get_int24(b2, off, True), get_int24(b3, off, True), f"Off{off}_LE24")

    # Try XOR 0xFF
    for k in range(256):
        xb1 = bytes([b ^ k for b in b1])
        xb2 = bytes([b ^ k for b in b2])
        xb3 = bytes([b ^ k for b in b3])
        
        check(get_int16(xb1, off, True), get_int16(xb2, off, True), get_int16(xb3, off, True), f"XOR{hex(k)}_Off{off}_LE16")
        
print("Done")

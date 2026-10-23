/**
 * Meshcore Protocol Decoder Module (JavaScript)
 * Implements official Meshcore V3 Layered Decoding, SMAZ Decompression, and Crypto.
 */

const SMAZ_CB = [
  " ", "the", "e", "t", "a", "of", "o", "and", "i", "n", "s", "e ", "r", " th", " t", "in", "he", "th", "h", "he ", "to", "\r\n", "l", "s ", "d", " a", "an", "er", "c", " o", "d ", "on", " of", "re", "of ", "t ", ", ", "is", "u", "at", "   ", "n ", "or", "which", "f", "m", "as", "it", "that", "\n", "was", "en", "  ", " w", "es", " an", " i", "\r", "f ", "g", "p", "nd", " s", "nd ", "ed ", "w", "ed", "http://", "for", "te", "ing", "y ", "The", " c", "ti", "r ", "his", "st", " in", "ar", "nt", ",", " to", "y", "ng", " h", "with", "le", "al", "to ", "b", "ou", "be", "were", " b", "se", "o ", "ent", "ha", "ng ", "their", "\"", "hi", "from", " f", "in ", "de", "ion", "me", "v", ".", "ve", "all", "re ", "ri", "ro", "is ", "co", "f t", "are", "ea", ". ", "her", " m", "er ", " p", "es ", "by", "they", "di", "ra", "ic", "not", "s, ", "d t", "at ", "ce", "la", "h ", "ne", "as ", "tio", "on ", "n t", "io", "we", " a ", "om", ", a", "s o", "ur", "li", "ll", "ch", "had", "this", "e t", "g ", "e\r\n", " wh", "ere", " co", "e o", "a ", "us", " d", "ss", "\n\r\n", "\r\n\r", "=\"", " be", " e", "s a", "ma", "one", "t t", "or ", "but", "el", "so", "l ", "e s", "s,", "no", "ter", " wa", "iv", "ho", "e a", " r", "hat", "s t", "ns", "ch ", "wh", "tr", "ut", "/", "have", "ly ", "ta", " ha", " on", "tha", "-", " l", "ati", "en ", "pe", " re", "there", "ass", "si", " fo", "wa", "ec", "our", "who", "its", "z", "fo", "rs", ">", "ot", "un", "<", "im", "th ", "nc", "ate", "><", "ver", "ad", " we", "ly", "ee", " n", "id", " cl", "ac", "il", "</", "rt", " wi", "div", "e, ", " it", "whi", " ma", "ge", "x", "e c", "men", ".com"
];

const ProtocolDecoder = {

  getSignalTypeName(type) {
    const types = {
      0x00: "REQ",
      0x01: "RESPONSE",
      0x02: "TXT_MSG",
      0x03: "ACK",
      0x04: "ADVERT",
      0x05: "GRP_TXT",
      0x06: "GRP_DATA",
      0x07: "ANON_REQ",
      0x08: "PATH",
      0x09: "TRACE",
      0x0A: "MULTIPART",
      0x0B: "RAW_CUSTOM",
      0x0C: "CONTROL",
      0x0E: "DISCOVER",
      0x8E: "DISCOVER_RESP",
      0x88: "RF_LOG"
    };
    return types[type] || `0x${type.toString(16).padStart(2, '0').toUpperCase()}`;
  },

  /**
   * SMAZ Decompressor
   */
  smazDecode(inputBytes) {
    let result = "";
    let i = 0;
    while (i < inputBytes.length) {
      const code = inputBytes[i] & 0xFF;
      if (code === 254) {
        if (i + 1 < inputBytes.length) {
          result += String.fromCharCode(inputBytes[i + 1] & 0xFF);
          i += 2;
        } else i++;
      } else if (code === 255) {
        if (i + 1 < inputBytes.length) {
          const len = (inputBytes[i + 1] & 0xFF) + 1;
          const start = i + 2;
          const end = Math.min(start + len, inputBytes.length);
          if (start < end) {
            const sub = inputBytes.slice(start, end);
            result += new TextDecoder("utf-8").decode(sub);
          }
          i += 2 + len;
        } else i++;
      } else if (code < SMAZ_CB.length) {
        result += SMAZ_CB[code];
        i++;
      } else i++;
    }
    return result;
  },

  stripPKCS7(bytes) {
    if (!bytes || bytes.length === 0) return bytes;
    const padLen = bytes[bytes.length - 1];
    if (padLen >= 1 && padLen <= 16 && bytes.length >= padLen) {
      let isPad = true;
      for (let i = bytes.length - padLen; i < bytes.length; i++) {
        if (bytes[i] !== padLen) {
          isPad = false;
          break;
        }
      }
      if (isPad) {
        return bytes.subarray ? bytes.subarray(0, bytes.length - padLen) : bytes.slice(0, bytes.length - padLen);
      }
    }
    return bytes;
  },

  cleanPrintableString(str) {
    if (!str || typeof str !== 'string') return "";
    let clean = "";
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
        clean += str[i];
      }
    }
    return clean.trim();
  },

  decodeTextBytes(textBytes) {
    if (!textBytes || textBytes.length === 0) return "";
    try {
      const bytes = new Uint8Array(textBytes);
      // 1. Convert to UTF-8 and split at the first null byte (\0)
      const rawUtf8 = new TextDecoder("utf-8").decode(bytes).split('\0')[0].trim();
      if (!rawUtf8) return "";

      // 2. Check if SMAZ compressed (starts with "s:")
      if (rawUtf8.startsWith("s:")) {
        try {
          const base64 = rawUtf8.substring(2);
          const binary = atob(base64);
          const decBytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) decBytes[i] = binary.charCodeAt(i);
          const dec = this.smazDecode(decBytes);
          if (dec && dec.length > 0) return dec.trim();
        } catch (e) {}
      }

      return rawUtf8;
    } catch (e) {
      return "";
    }
  },

  tryDecodePrefixed(textOrBytes) {
    if (!textOrBytes) return "";
    if (textOrBytes instanceof Uint8Array || Array.isArray(textOrBytes) || textOrBytes.buffer) {
      return this.decodeTextBytes(textOrBytes);
    }
    if (typeof textOrBytes !== 'string') return String(textOrBytes);
    if (!textOrBytes.startsWith("s:")) return this.cleanPrintableString(textOrBytes);
    try {
      const base64 = textOrBytes.substring(2);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const dec = this.cleanPrintableString(this.smazDecode(bytes));
      return (dec && this.isPrintable(dec)) ? dec : textOrBytes;
    } catch (e) {
      return this.cleanPrintableString(textOrBytes);
    }
  },

  isPrintable(str) {
    if (!str || typeof str !== 'string') return false;
    let printableCount = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
        printableCount++;
      }
    }
    return (printableCount / str.length) >= 0.75;
  },

  splitSenderAndText(text) {
    if (!text) return { sender: null, body: "" };
    let cleanText = text;
    if (text.startsWith("[") && text.includes("] ")) {
      cleanText = text.substring(text.indexOf("] ") + 2).trim();
    }
    const colon = cleanText.indexOf(": ");
    if (colon >= 1 && colon <= 32) {
      const candidate = cleanText.substring(0, colon).trim();
      if (candidate.length > 0 && !candidate.includes("\n")) {
        return { sender: candidate, body: cleanText.substring(colon + 2).trim() };
      }
    }
    return { sender: null, body: text };
  },

  // --- Pure JS AES-128-ECB Decryption & HMAC-SHA256 for MeshCore Channels ---
  Crypto: {
    async sha256(data) {
      const buffer = await crypto.subtle.digest("SHA-256", data);
      return new Uint8Array(buffer);
    },

    async decryptAES(key, encrypted) {
      if (!encrypted || encrypted.length < 2) return null;
      const mac = encrypted.slice(0, 2);
      const cipherText = encrypted.slice(2);

      if (cipherText.length === 0 || cipherText.length % 16 !== 0) return null;

      // Convert hex string PSK or Uint8Array
      const key32 = new Uint8Array(32);
      if (typeof key === 'string') {
        const cleanHex = key.trim().replace(/^0x/i, '');
        if (cleanHex.length === 32 || cleanHex.length === 64) {
          const hexBytes = new Uint8Array(cleanHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
          key32.set(hexBytes.subarray(0, Math.min(hexBytes.length, 32)));
        } else {
          const keyBytes = new TextEncoder().encode(key);
          key32.set(keyBytes.subarray(0, Math.min(keyBytes.length, 32)));
        }
      } else if (key) {
        key32.set(key.subarray ? key.subarray(0, Math.min(key.length, 32)) : new Uint8Array(key));
      }

      let hmacMatch = false;
      try {
        const hmacKey = await crypto.subtle.importKey(
          "raw",
          key32,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sigBuffer = await crypto.subtle.sign("HMAC", hmacKey, cipherText);
        const sig = new Uint8Array(sigBuffer);

        if (sig[0] === mac[0] && sig[1] === mac[1]) {
          hmacMatch = true;
        }
      } catch (e) {
        // Fallback if WebCrypto throws
      }

      // 2. Decrypt AES-128-ECB
      const key16 = new Uint8Array(16);
      key16.set(key32.subarray(0, 16));

      const decrypted = this.decryptAES128ECB(key16, cipherText);
      if (!decrypted) return null;

      if (hmacMatch) return decrypted;

      // Fallback check: Verify if decrypted content contains valid printable text / Smaz
      try {
        const textBytes = decrypted.length >= 5 ? decrypted.slice(5) : decrypted;
        const textDec = ProtocolDecoder.tryDecodePrefixed(textBytes);
        if (ProtocolDecoder.isPrintable(textDec)) {
          return decrypted;
        }
      } catch (e) {}

      return null;
    },

    decryptAES128ECB(key16, cipherText) {
      if (cipherText.length % 16 !== 0) return null;

      const SBOX = new Uint8Array([
        0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
        0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
        0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
        0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
        0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
        0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
        0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
        0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
        0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
        0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
        0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
        0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
        0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
        0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
        0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
        0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
      ]);

      const INV_SBOX = new Uint8Array(256);
      for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;

      function mul(a, b) {
        let p = 0;
        for (let i = 0; i < 8; i++) {
          if (b & 1) p ^= a;
          let hi = a & 0x80;
          a = (a << 1) & 0xff;
          if (hi) a ^= 0x1b;
          b >>= 1;
        }
        return p;
      }

      function decryptBlock(block16) {
        const w = new Uint32Array(44);
        const rcon = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
        for (let i = 0; i < 4; i++) {
          w[i] = (key16[4*i] << 24) | (key16[4*i+1] << 16) | (key16[4*i+2] << 8) | key16[4*i+3];
        }
        for (let i = 4; i < 44; i++) {
          let temp = w[i-1];
          if (i % 4 === 0) {
            temp = (temp << 8) | (temp >>> 24);
            temp = (SBOX[(temp >>> 24) & 0xff] << 24) | (SBOX[(temp >>> 16) & 0xff] << 16) | (SBOX[(temp >>> 8) & 0xff] << 8) | SBOX[temp & 0xff];
            temp ^= (rcon[i/4] << 24);
          }
          w[i] = w[i-4] ^ temp;
        }

        let state = new Uint8Array(16);
        for (let i = 0; i < 16; i++) state[i] = block16[i];

        for (let c = 0; c < 4; c++) {
          const rk = w[40 + c];
          state[c*4]     ^= (rk >>> 24) & 0xff;
          state[c*4 + 1] ^= (rk >>> 16) & 0xff;
          state[c*4 + 2] ^= (rk >>> 8)  & 0xff;
          state[c*4 + 3] ^= rk & 0xff;
        }

        for (let round = 9; round >= 1; round--) {
          let tmp = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = tmp;
          tmp = state[2]; state[2] = state[10]; state[10] = tmp; tmp = state[6]; state[6] = state[14]; state[14] = tmp;
          tmp = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = tmp;

          for (let i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]];

          for (let c = 0; c < 4; c++) {
            const rk = w[round * 4 + c];
            state[c*4]     ^= (rk >>> 24) & 0xff;
            state[c*4 + 1] ^= (rk >>> 16) & 0xff;
            state[c*4 + 2] ^= (rk >>> 8)  & 0xff;
            state[c*4 + 3] ^= rk & 0xff;
          }

          for (let c = 0; c < 4; c++) {
            const i = c * 4;
            const s0 = state[i], s1 = state[i+1], s2 = state[i+2], s3 = state[i+3];
            state[i]   = mul(s0, 0x0e) ^ mul(s1, 0x0b) ^ mul(s2, 0x0d) ^ mul(s3, 0x09);
            state[i+1] = mul(s0, 0x09) ^ mul(s1, 0x0e) ^ mul(s2, 0x0b) ^ mul(s3, 0x0d);
            state[i+2] = mul(s0, 0x0d) ^ mul(s1, 0x09) ^ mul(s2, 0x0e) ^ mul(s3, 0x0b);
            state[i+3] = mul(s0, 0x0b) ^ mul(s1, 0x0d) ^ mul(s2, 0x09) ^ mul(s3, 0x0e);
          }
        }

        let tmp = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = tmp;
        tmp = state[2]; state[2] = state[10]; state[10] = tmp; tmp = state[6]; state[6] = state[14]; state[14] = tmp;
        tmp = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = tmp;

        for (let i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]];

        for (let c = 0; c < 4; c++) {
          const rk = w[c];
          state[c*4]     ^= (rk >>> 24) & 0xff;
          state[c*4 + 1] ^= (rk >>> 16) & 0xff;
          state[c*4 + 2] ^= (rk >>> 8)  & 0xff;
          state[c*4 + 3] ^= rk & 0xff;
        }

        return state;
      }

      const out = new Uint8Array(cipherText.length);
      for (let offset = 0; offset < cipherText.length; offset += 16) {
        const block = cipherText.subarray(offset, offset + 16);
        const dec = decryptBlock(block);
        out.set(dec, offset);
      }

      // Strip PKCS7 Padding
      if (out.length > 0) {
        const padLen = out[out.length - 1];
        if (padLen >= 1 && padLen <= 16 && out.length >= padLen) {
          let isPad = true;
          for (let i = out.length - padLen; i < out.length; i++) {
            if (out[i] !== padLen) {
              isPad = false;
              break;
            }
          }
          if (isPad) {
            return out.subarray(0, out.length - padLen);
          }
        }
      }
      return out;
    }
  },

  /**
   * Main entry point for decoding incoming BLE data frame
   */
  decodeCompanionFrame(data) {
    if (!data || data.length === 0) return null;

    const code = data[0] & 0xFF;

    // PACKET_OK (0x00)
    if (code === 0x00) {
      return { type: "PacketOk" };
    }

    // PACKET_MESSAGES_WAITING (0x83)
    if (code === 0x83) {
      return { type: "MessagesWaiting" };
    }

    // PACKET_NO_MORE_MSGS (0x0A)
    if (code === 0x0A) {
      return { type: "NoMoreMessages" };
    }

    // MSG_SENT (0x06) - Device accepted message for transmission
    if (code === 0x06) {
      if (data.length >= 10) {
        const ackTag = ((data[2] & 0xFF) | ((data[3] & 0xFF) << 8) | ((data[4] & 0xFF) << 16) | ((data[5] & 0xFF) * 0x1000000)) >>> 0;
        const radioHash = ((data[6] & 0xFF) | ((data[7] & 0xFF) << 8) | ((data[8] & 0xFF) << 16) | ((data[9] & 0xFF) * 0x1000000)) >>> 0;
        return { type: "MessageStatus", status: 1, ackTag, radioHash, timeout: radioHash };
      }
    }

    // MSG_ACK (0x82) - Remote node acknowledged message
    if (code === 0x82) {
      if (data.length >= 5) {
        const ackTag = ((data[1] & 0xFF) | ((data[2] & 0xFF) << 8) | ((data[3] & 0xFF) << 16) | ((data[4] & 0xFF) * 0x1000000)) >>> 0;
        return { type: "MessageStatus", status: 2, ackTag };
      }
    }

    // RESP_CODE_CONTACTS_START (0x02)
    if (code === 0x02 && data.length <= 4) {
      return { type: "ContactsStart" };
    }

    // RESP_CODE_END_OF_CONTACTS (0x04)
    if (code === 0x04 && data.length < 33) {
      return { type: "ContactsEnd" };
    }

    // 1. SELF_INFO (0x05) - Exact Match with ProtocolDecoder.kt line 166 & WardriveService.kt line 1353
    if (code === 0x05) {
      let pubKeyHex = "";
      if (data.length >= 33) {
        for (let i = 1; i < 33; i++) {
          pubKeyHex += data[i].toString(16).padStart(2, '0').toLowerCase();
        }
      }
      const shortId = (data.length >= 10) ? this.readId(data, 4, 6) : (pubKeyHex ? pubKeyHex.substring(0, 4).toUpperCase() : "SELF");

      let name = null;

      // Extract Name: Check offset 58+ (ProtocolDecoder.kt line 166) or offset 100+ (WardriveService.kt line 1160)
      if (data.length > 58) {
        const nameBytes58 = data.slice(58, Math.min(58 + 32, data.length));
        const nameStr58 = new TextDecoder("utf-8").decode(nameBytes58).split('\0')[0].trim();
        if (nameStr58 && nameStr58 !== "Self" && nameStr58.length > 0 && !nameStr58.includes('\uFFFD')) {
          name = nameStr58;
        }

        if (!name && data.length >= 100) {
          const nameBytes100 = data.slice(100, Math.min(100 + 32, data.length));
          const nameStr100 = new TextDecoder("utf-8").decode(nameBytes100).split('\0')[0].trim();
          if (nameStr100 && nameStr100 !== "Self" && nameStr100.length > 0 && !nameStr100.includes('\uFFFD')) {
            name = nameStr100;
          }
        }
      }

      let lat = 0, lon = 0;
      if (data.length >= 44) {
        let latRaw = 0, lonRaw = 0;
        if (data.length >= 144) {
          const view = new DataView(data.buffer, data.byteOffset + 136, 8);
          latRaw = view.getInt32(0, true);
          lonRaw = view.getInt32(4, true);
        }
        if (latRaw === 0 && lonRaw === 0 && data.length >= 44) {
          const view = new DataView(data.buffer, data.byteOffset + 36, 8);
          latRaw = view.getInt32(0, true);
          lonRaw = view.getInt32(4, true);
        }
        lat = latRaw / 1000000.0;
        lon = lonRaw / 1000000.0;
      }

      return {
        type: "SelfInfo",
        id: shortId,
        pubKey: pubKeyHex,
        name: name,
        lat,
        lon
      };
    }

    // 2. BATTERY_STATUS (0x0C = 12 OR 0x16 0x01 / 0x16 0x0C)
    if (code === 0x0C || code === 12 || (code === 0x16 && data.length >= 4 && (data[1] === 0x01 || data[1] === 0x0C))) {
      const offset = (code === 0x16) ? 2 : 1;
      if (data.length >= offset + 2) {
        const mv = (data[offset] & 0xFF) | ((data[offset + 1] & 0xFF) << 8);
        const voltage = mv / 1000.0;
        let usedStorage = 0, totalStorage = 0;
        if (data.length >= offset + 10) {
          const view = new DataView(data.buffer, data.byteOffset + offset + 2, 8);
          usedStorage = view.getUint32(0, true);
          totalStorage = view.getUint32(4, true);
        }
        return {
          type: "BatteryStatus",
          voltage,
          usedStorage,
          totalStorage
        };
      }
    }

    // 3. DEVICE_INFO (0x0D = 13)
    if (code === 0x0D || code === 13) {
      const textBytes = data.slice(1);
      const infoStr = new TextDecoder("utf-8").decode(textBytes).split('\0')[0].trim();
      return {
        type: "DeviceInfo",
        infoStr
      };
    }

    // 4. CHANNEL_INFO (0x12 = 18)
    if (code === 0x12 || code === 18) {
      if (data.length >= 2) {
        const idx = data[1] & 0xFF;
        let nameStr = "";
        if (data.length >= 18) {
          const nameBytes = data.slice(2, Math.min(34, data.length));
          nameStr = new TextDecoder("utf-8").decode(nameBytes).split('\0')[0].trim();
        }

        let psk = new Uint8Array(16);
        if (data.length >= 50) {
          psk = data.slice(34, 50);
        }

        let scopeStr = null;
        if (data.length >= 66) {
          const scopeBytes = data.slice(50, 66);
          const rawScope = new TextDecoder("utf-8").decode(scopeBytes).split('\0')[0].trim();
          if (rawScope) {
            const norm = (typeof MeshCoreScope !== 'undefined' && MeshCoreScope.normalize)
              ? MeshCoreScope.normalize(rawScope)
              : (rawScope.startsWith('#') ? rawScope : `#${rawScope}`);
            scopeStr = (norm === "" || norm === "*") ? null : norm;
          }
        }

        let isEmpty = false;
        if (!nameStr) {
           let pskEmpty = true;
           if (data.length >= 50) {
             for(let i=34; i<50; i++) {
               if(data[i] !== 0) { pskEmpty = false; break; }
             }
           }
           isEmpty = pskEmpty;
        }

        return {
          type: "ChannelInfo",
          index: idx,
          name: nameStr || `CH${idx}`,
          psk: psk,
          scope: scopeStr || null,
          isEmpty: isEmpty
        };
      }
    }

    // 5. Companion Contact (0x03 or 0x8A) (Removed 0x10 because 0x10 is V3 DM)
    if (code === 0x03 || code === 0x8A) {
      if (data.length >= 33) {
        let pubKeyHex = "";
        for (let i = 1; i < 33; i++) {
          pubKeyHex += data[i].toString(16).padStart(2, '0').toLowerCase();
        }
        const shortId = pubKeyHex.substring(0, 4).toUpperCase();
        const role = data.length > 33 ? (data[33] & 0xFF) : 1;

        let name = shortId;
        if (data.length >= 100) {
          const nameBytes = data.slice(100, Math.min(132, data.length));
          const nameStr = new TextDecoder("utf-8").decode(nameBytes).split('\0')[0].trim();
          if (nameStr) name = nameStr;
        }

        let lat = 0, lon = 0;
        if (data.length >= 144) {
          const view = new DataView(data.buffer, data.byteOffset + 136, 8);
          lat = view.getInt32(0, true) / 1000000.0;
          lon = view.getInt32(4, true) / 1000000.0;
        }

        return {
          type: "CompanionContact",
          code,
          id: shortId,
          pubKey: pubKeyHex,
          name,
          role,
          lat,
          lon
        };
      }
    }

    // 6. RF Log Frame (0x88)
    if (code === 0x88) {
      return {
        type: "RfLog",
        rfLog: this.decodeRfLog(data)
      };
    }

    // 7. DISCOVER_RESP Frame (0x8E = 142)
    if (code === 0x8E) {
      if (data.length >= 12) {
        let snrRaw = data[1];
        if (snrRaw > 127) snrRaw -= 256;
        const snr = Math.round(snrRaw / 4.0);

        let rssi = data[2];
        if (rssi > 127) rssi -= 256;

        const shortId = this.readId(data, 10, 2);

        let name = shortId;
        let lat = 0, lon = 0;

        if (data.length >= 18 && data[16] === 4) {
          const payloadData = data.slice(17);
          const advert = this.decodePayload(0x04, payloadData);
          if (advert) {
            if (advert.name) name = advert.name;
            if (advert.lat) lat = advert.lat;
            if (advert.lon) lon = advert.lon;
          }
        }

        return {
          type: "RfLog",
          rfLog: {
            snr,
            rssi,
            meshPacket: {
              routeType: 0,
              payloadType: 14,
              payloadVersion: 0,
              transportCodes: null,
              hopCount: 0,
              hashSize: 2,
              path: [shortId],
              lastHopId: shortId,
              payload: { type: "Advert", name, lat, lon },
              rawMeshPacket: data
            },
            rawBytes: data
          }
        };
      }
    }

    // 8. Companion Protocol Chat Messages (0x10, 0x11, 0x07, 0x08)
    if (code === 0x10 || code === 0x11 || code === 0x07 || code === 0x08) {
      const isV3 = (code === 0x10 || code === 0x11);
      const isDM = (code === 0x10 || code === 0x07);

      let snr = 5;
      let hasPath = false;
      let o = 1;

      if (isV3) {
        if (data.length < 11) return null;
        let snrRaw = data[1];
        if (snrRaw > 127) snrRaw -= 256;
        snr = Math.round(snrRaw / 4.0);
        hasPath = (data[2] & 0x01) !== 0;
        o = 4;
      } else {
        if (data.length < 8) return null;
      }

      let cIdx = null;
      if (!isDM) {
        if (o >= data.length) return null;
        cIdx = data[o] & 0xFF;
        o++;
      }

      let src = "";
      if (isDM) {
        if (o + 6 > data.length) return null;
        src = this.readId(data, o, 6);
        o += 6;
      } else {
        src = `CH${cIdx}`;
      }

      if (o >= data.length) return null;
      const pRaw = data[o] & 0xFF;
      o++;

      if (isV3) o++; // skip type byte

      if (o + 4 > data.length) return null;
      // Read 32-bit Little Endian Timestamp
      const ts = (data[o] & 0xFF) | ((data[o + 1] & 0xFF) << 8) | ((data[o + 2] & 0xFF) << 16) | ((data[o + 3] & 0xFF) * 0x1000000);
      o += 4;

      const sIdx = (pRaw >> 6) & 0x03;
      const sz = sIdx + 1; // 00->1 byte, 01->2 bytes, 10->3 bytes, 11->4 bytes per official MeshCore V3 spec
      const hops = (pRaw === 0xFF) ? 0 : (pRaw & 0x3F);

      if (hasPath && hops > 0 && o + (hops * sz) <= data.length) {
        o += (hops * sz);
      }

      if (o < data.length) {
        const rawBytes = data.slice(o);
        const decStr = this.tryDecodePrefixed(rawBytes);
        const split = this.splitSenderAndText(decStr);

        let disp = split.body || decStr;
        if (split.sender) disp = `${split.sender}: ${disp}`;
        if (!isDM) {
           disp = `[CH${cIdx}] ${disp}`;
        }

        return {
          type: "Message",
          isDM,
          senderId: isDM ? src : `CH${cIdx}`,
          realSender: split.sender,
          text: disp,
          hopCount: hops,
          timestamp: ts,
          snr: snr
        };
      }
    }

    // Direct MeshPacket Fallback
    const meshPacket = this.decodeMeshPacket(data);
    if (meshPacket) {
      return {
        type: "RfLog",
        rfLog: {
          snr: 5,
          rssi: -75,
          meshPacket,
          rawBytes: data
        }
      };
    }

    return null;
  },

  /**
   * Decodes RF Log Packet (0x88)
   */
  decodeRfLog(data) {
    if (!data || data.length < 4) return null;
    const opcode = data[0] & 0xFF;
    if (opcode !== 0x88) {
      const mesh = this.decodeMeshPacket(data);
      if (mesh) {
        return { snr: 5, rssi: -75, meshPacket: mesh, rawBytes: data };
      }
      return null;
    }

    let snrRaw = data[1];
    if (snrRaw > 127) snrRaw -= 256;
    const snr = Math.round(snrRaw / 4.0);

    let rssi = data[2];
    if (rssi > 127) rssi -= 256;

    const rawMesh = data.slice(3);
    const meshPacket = this.decodeMeshPacket(rawMesh);

    return {
      snr,
      rssi,
      meshPacket,
      rawBytes: data
    };
  },

  /**
   * Decodes raw MeshCore Packet
   */
  decodeMeshPacket(data) {
    if (!data || data.length === 0) return null;

    const header = data[0] & 0xFF;
    const routeType = header & 0x03;
    const payloadType = (header >> 2) & 0x0F;
    const payloadVersion = (header >> 6) & 0x03;

    if (payloadVersion !== 0) return null;

    let offset = 1;
    let transportCodes = null;

    if (routeType === 0 || routeType === 3) {
      if (data.length < offset + 4) return null;
      transportCodes = data.slice(offset, offset + 4);
      offset += 4;
    }

    if (data.length < offset + 1) return null;
    const pathLengthByte = data[offset] & 0xFF;
    offset += 1;

    const hopCount = pathLengthByte & 0x3F;
    const hashSize = ((pathLengthByte >> 6) & 0x03) + 1;

    const path = [];
    const pathByteCount = hopCount * hashSize;
    if (data.length < offset + pathByteCount) return null;

    for (let i = 0; i < hopCount; i++) {
      const start = offset + (i * hashSize);
      let hashHex = "";
      for (let j = 0; j < hashSize; j++) {
        hashHex += data[start + j].toString(16).padStart(2, '0').toUpperCase();
      }
      path.push(hashHex);
    }

    const lastHopId = path.length > 0 ? path[path.length - 1] : "DIRECT";
    offset += pathByteCount;

    let messageHash = null;
    if (transportCodes && transportCodes.length >= 4) {
      messageHash = ((transportCodes[0] & 0xFF) |
                    ((transportCodes[1] & 0xFF) << 8) |
                    ((transportCodes[2] & 0xFF) << 16) |
                    ((transportCodes[3] & 0xFF) * 0x1000000)) >>> 0;
    }

    const rawPayload = offset < data.length ? data.slice(offset) : new Uint8Array(0);
    const payload = this.decodePayload(payloadType, rawPayload);

    return {
      routeType,
      payloadType,
      payloadVersion,
      transportCodes,
      messageHash,
      hopCount,
      hashSize,
      path,
      lastHopId,
      payload,
      rawMeshPacket: data
    };
  },

  /**
   * Decodes MeshCore Payload
   */
  decodePayload(type, data) {
    if (type === 0x04) {
      // Advert
      if (data.length >= 100) {
        let pubKeyHex = "";
        for (let i = 0; i < 32; i++) {
          pubKeyHex += data[i].toString(16).padStart(2, '0').toLowerCase();
        }
        let flags = data.length > 100 ? (data[100] & 0xFF) : 0;
        let lat = null, lon = null, name = null;
        let offset = 101;

        if ((flags & 0x10) && data.length >= offset + 8) {
          const view = new DataView(data.buffer, data.byteOffset + offset, 8);
          lat = view.getInt32(0, true) / 1000000.0;
          lon = view.getInt32(4, true) / 1000000.0;
          offset += 8;
        }

        if ((flags & 0x80) && data.length > offset) {
          const textBytes = data.slice(offset);
          const str = new TextDecoder("utf-8").decode(textBytes);
          name = str.split('\0')[0].trim();
        }

        return { type: "Advert", rawPayload: data, pubKey: pubKeyHex, flags, lat, lon, name };
      }
    } else if (type === 0x02) {
      // TxtMsg (TS 4 bytes + TxtType 1 byte + Msg Text)
      if (data.length >= 5) {
        const textBytes = data.slice(5);
        const textDec = this.decodeTextBytes(textBytes);
        return { type: "TxtMsg", rawPayload: data, text: textDec };
      }
    }
    return { type: "Generic", rawPayload: data };
  },

  readId(data, offset, size) {
    if (offset + size > data.length) return "";
    let idHex = "";
    for (let i = 0; i < size; i++) {
      idHex += data[offset + i].toString(16).padStart(2, '0').toUpperCase();
    }
    return idHex;
  },

  bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => (b & 0xFF).toString(16).padStart(2, '0').toUpperCase())
      .join('');
  },

  hexToBytes(hex) {
    if (!hex) return new Uint8Array(0);
    const cleanHex = hex.trim();
    const bytes = new Uint8Array(Math.floor(cleanHex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16) || 0;
    }
    return bytes;
  },

  decodeRawHex(hex) {
    if (!hex) return null;
    try {
      const bytes = this.hexToBytes(hex);
      if (!bytes || bytes.length === 0) return null;
      if (bytes[0] === 0x88) {
        const rfLog = this.decodeRfLog(bytes);
        if (rfLog) return rfLog.meshPacket || rfLog;
      }
      const mesh = this.decodeMeshPacket(bytes);
      if (mesh) return mesh;
      const frame = this.decodeCompanionFrame(bytes);
      if (frame) return frame;
      return null;
    } catch (e) {
      return null;
    }
  }
};

window.ProtocolDecoder = ProtocolDecoder;

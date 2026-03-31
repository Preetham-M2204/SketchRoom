const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length))
  }
  return code
}

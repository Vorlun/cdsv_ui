const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isProbablyIpv4(value) {
  if (typeof value !== "string") return false;
  return IPV4_PATTERN.test(value.trim());
}

// Usage: glyphs <fontfile> <size> <wght|0> <tracking> <x> <y> <text>
// Prints: advanceWidth \n svg path data (baseline at y, x start)
import Foundation
import CoreText
import CoreGraphics
let a = CommandLine.arguments
let url = URL(fileURLWithPath: a[1]) as CFURL
let size = CGFloat(Double(a[2])!), wght = Double(a[3])!, tracking = CGFloat(Double(a[4])!)
let x0 = CGFloat(Double(a[5])!), y0 = CGFloat(Double(a[6])!)
let text = a[7]
guard let descs = CTFontManagerCreateFontDescriptorsFromURL(url) as? [CTFontDescriptor], let d0 = descs.first else { print("ERR load"); exit(1) }
var desc = d0
if wght > 0 { desc = CTFontDescriptorCreateCopyWithVariation(d0, NSNumber(value: 0x77676874), CGFloat(wght)) }
let font = CTFontCreateWithFontDescriptor(desc, size, nil)
let attr = NSAttributedString(string: text, attributes: [kCTFontAttributeName as NSAttributedString.Key: font, kCTKernAttributeName as NSAttributedString.Key: tracking])
let line = CTLineCreateWithAttributedString(attr)
var out = ""
func f(_ v: CGFloat) -> String { String(format: "%.2f", v) }
for run in CTLineGetGlyphRuns(line) as! [CTRun] {
  let n = CTRunGetGlyphCount(run)
  var glyphs = [CGGlyph](repeating: 0, count: n); var pos = [CGPoint](repeating: .zero, count: n)
  CTRunGetGlyphs(run, CFRange(location: 0, length: n), &glyphs); CTRunGetPositions(run, CFRange(location: 0, length: n), &pos)
  let rf = (CTRunGetAttributes(run) as NSDictionary)[kCTFontAttributeName] as! CTFont
  for i in 0..<n {
    guard let p = CTFontCreatePathForGlyph(rf, glyphs[i], nil) else { continue }
    let ox = x0 + pos[i].x, oy = y0
    p.applyWithBlock { el in
      let e = el.pointee; let pts = e.points
      let P = { (k: Int) -> String in "\(f(ox + pts[k].x)) \(f(oy - pts[k].y))" }
      switch e.type {
      case .moveToPoint: out += "M\(P(0))"
      case .addLineToPoint: out += "L\(P(0))"
      case .addQuadCurveToPoint: out += "Q\(P(0)) \(P(1))"
      case .addCurveToPoint: out += "C\(P(0)) \(P(1)) \(P(2))"
      case .closeSubpath: out += "Z"
      @unknown default: break
      }
    }
  }
}
print(f(CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))))
print(out)

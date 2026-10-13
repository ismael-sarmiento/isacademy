import Foundation
import CoreImage
import AppKit
let args = CommandLine.arguments
if args[1] == "gen" {
  let f = CIFilter(name: "CIQRCodeGenerator")!
  f.setValue(args[2].data(using: .utf8), forKey: "inputMessage")
  f.setValue(args[3], forKey: "inputCorrectionLevel")
  let img = f.outputImage!
  let ctx = CIContext()
  let cg = ctx.createCGImage(img, from: img.extent)!
  let rep = NSBitmapImageRep(cgImage: cg)
  var rows: [String] = []
  for y in 0..<rep.pixelsHigh { var r = ""; for x in 0..<rep.pixelsWide { r += (rep.colorAt(x: x, y: y)!.brightnessComponent < 0.5) ? "1" : "0" }; rows.append(r) }
  print(rows.joined(separator: "\n"))
} else {
  let img = CIImage(contentsOf: URL(fileURLWithPath: args[2]))!
  let det = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
  let found = det.features(in: img).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
  print(found.isEmpty ? "NO QR FOUND" : found.joined(separator: " | "))
}

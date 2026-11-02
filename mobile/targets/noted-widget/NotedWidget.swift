import SwiftUI
import WidgetKit

// MARK: - Shared data (written by the app via ExtensionStorage into the App Group)

let appGroup = "group.com.tingcc.noted"

struct NoteEntryData: Codable {
  let date: String      // YYYY-MM-DD (local)
  let id: String
  let type: String      // quote | post
  let text: String
  let attribution: String
  let bg: String
  let url: String
}

struct NoteEntry: TimelineEntry {
  let date: Date
  let data: NoteEntryData?
}

enum NoteStore {
  static func load() -> [NoteEntryData] {
    guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: "picks"),
          let json = raw.data(using: .utf8),
          let list = try? JSONDecoder().decode([NoteEntryData].self, from: json) else { return [] }
    return list
  }

  static let fmt: DateFormatter = {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = .current
    f.dateFormat = "yyyy-MM-dd"
    return f
  }()

  static func midnight(_ s: String) -> Date? { fmt.date(from: s) }
}

// MARK: - Timeline: one entry per precomputed day, each starting at local midnight

struct Provider: TimelineProvider {
  static let sample = NoteEntryData(
    date: NoteStore.fmt.string(from: Date()), id: "sample", type: "quote",
    text: "行到水穷处，坐看云起时。", attribution: "王维 / 《终南别业》", bg: "calm", url: "noted://home")

  func placeholder(in context: Context) -> NoteEntry { NoteEntry(date: Date(), data: Provider.sample) }

  func getSnapshot(in context: Context, completion: @escaping (NoteEntry) -> Void) {
    let list = NoteStore.load()
    let today = NoteStore.fmt.string(from: Date())
    completion(NoteEntry(date: Date(), data: list.first(where: { $0.date == today }) ?? list.first ?? Provider.sample))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<NoteEntry>) -> Void) {
    let list = NoteStore.load()
    guard !list.isEmpty else {
      completion(Timeline(entries: [NoteEntry(date: Date(), data: nil)], policy: .after(Date().addingTimeInterval(3600))))
      return
    }
    let startOfToday = Calendar.current.startOfDay(for: Date())
    var entries: [NoteEntry] = []
    for item in list {
      guard let d = NoteStore.midnight(item.date) else { continue }
      if d < startOfToday { continue }
      entries.append(NoteEntry(date: d == startOfToday ? Date() : d, data: item))
    }
    if entries.isEmpty, let last = list.last {   // dates ran out: keep the last good entry
      entries = [NoteEntry(date: Date(), data: last)]
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - View (matches the 微信读书 medium widget reference)

struct DateBox: View {
  let date: Date
  var body: some View {
    let day = Calendar.current.component(.day, from: date)
    let month = date.formatted(Date.FormatStyle(locale: Locale(identifier: "en_US")).month(.abbreviated)).uppercased()
    VStack(spacing: 0) {
      Text("\(day)")
        .font(.system(size: 34, weight: .bold, design: .default))
        .minimumScaleFactor(0.6)
      Text(month)
        .font(.system(size: 13, weight: .bold))
        .kerning(2.2)
    }
    .foregroundStyle(.white)
    .frame(width: 66, height: 66)
    .overlay(Rectangle().stroke(.white, lineWidth: 2))
  }
}

struct NotedWidgetView: View {
  var entry: NoteEntry

  var body: some View {
    if let data = entry.data {
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top, spacing: 14) {
          Text(data.text)
            .font(.custom("NotoSerifSC-Regular", size: 18))
            .lineSpacing(7)
            .foregroundStyle(.white)
            .lineLimit(3)
            .minimumScaleFactor(0.85)
            .frame(maxWidth: .infinity, alignment: .leading)
            .shadow(color: .black.opacity(0.12), radius: 3, y: 1)
          DateBox(date: NoteStore.midnight(data.date) ?? entry.date)
        }
        Spacer(minLength: 6)
        Text(data.attribution)
          .font(.system(size: 13, weight: .regular))
          .foregroundStyle(.white.opacity(0.92))
          .lineLimit(1)
          .truncationMode(.tail)
      }
      .padding(.horizontal, 20)
      .padding(.top, 18)
      .padding(.bottom, 16)
      .widgetURL(URL(string: data.type == "post" ? "noted://home?open=xhs&id=\(data.id)" : "noted://home?date=\(data.date)"))
    } else {
      VStack(alignment: .leading, spacing: 6) {
        Text("Nōted").font(.custom("NotoSerifSC-Regular", size: 24)).foregroundStyle(.white)
        Text("Open the app to set up your notes").font(.system(size: 13)).foregroundStyle(.white.opacity(0.9))
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .padding(20)
    }
  }
}

struct WidgetBackground: View {
  let bg: String
  var body: some View {
    ZStack {
      Image("bg_\(bg)").resizable().scaledToFill()
      LinearGradient(
        colors: [Color(red: 0.36, green: 0.42, blue: 0.48).opacity(0.55), Color(red: 0.36, green: 0.42, blue: 0.48).opacity(0.28)],
        startPoint: .topLeading, endPoint: .bottomTrailing)
    }
  }
}

struct NotedDailyWidget: Widget {
  let kind = "NotedDailyWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      NotedWidgetView(entry: entry)
        .containerBackground(for: .widget) { WidgetBackground(bg: entry.data?.bg ?? "calm") }
    }
    .configurationDisplayName("Nōted")
    .description("A little note, delivered every day.")
    .supportedFamilies([.systemMedium])
    .contentMarginsDisabled()
  }
}

@main
struct NotedWidgetBundle: WidgetBundle {
  var body: some Widget { NotedDailyWidget() }
}

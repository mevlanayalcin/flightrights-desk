// 72 real global IATA airports (WGS-84 coordinates & statutory jurisdiction regions)
// plus 32 major IATA airlines with exact operating-carrier legal domicile.

export const AIRPORTS = {
  // Switzerland (CH-EU Air Transport Agreement applies EU261)
  ZRH: { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "CH", region: "CH", lat: 47.4647, lon: 8.5492 },
  GVA: { code: "GVA", name: "Geneva Airport", city: "Geneva", country: "CH", region: "CH", lat: 46.2381, lon: 6.1089 },
  BSL: { code: "BSL", name: "EuroAirport Basel-Mulhouse", city: "Basel", country: "CH", region: "CH", lat: 47.5896, lon: 7.5299 },
  // EU / EEA
  FRA: { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "DE", region: "EU", lat: 50.0379, lon: 8.5622 },
  MUC: { code: "MUC", name: "Munich Airport", city: "Munich", country: "DE", region: "EU", lat: 48.3537, lon: 11.7750 },
  BER: { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "DE", region: "EU", lat: 52.3667, lon: 13.5033 },
  HAM: { code: "HAM", name: "Hamburg Airport", city: "Hamburg", country: "DE", region: "EU", lat: 53.6304, lon: 9.9882 },
  DUS: { code: "DUS", name: "Dusseldorf Airport", city: "Dusseldorf", country: "DE", region: "EU", lat: 51.2895, lon: 6.7668 },
  CDG: { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "FR", region: "EU", lat: 49.0097, lon: 2.5479 },
  ORY: { code: "ORY", name: "Paris Orly", city: "Paris", country: "FR", region: "EU", lat: 48.7262, lon: 2.3652 },
  NCE: { code: "NCE", name: "Nice Cote d Azur", city: "Nice", country: "FR", region: "EU", lat: 43.6584, lon: 7.2159 },
  AMS: { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "NL", region: "EU", lat: 52.3105, lon: 4.7683 },
  MAD: { code: "MAD", name: "Madrid Barajas", city: "Madrid", country: "ES", region: "EU", lat: 40.4983, lon: -3.5676 },
  BCN: { code: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "ES", region: "EU", lat: 41.2974, lon: 2.0833 },
  PMI: { code: "PMI", name: "Palma de Mallorca", city: "Palma", country: "ES", region: "EU", lat: 39.5517, lon: 2.7388 },
  AGP: { code: "AGP", name: "Malaga Costa del Sol", city: "Malaga", country: "ES", region: "EU", lat: 36.6749, lon: -4.4991 },
  FCO: { code: "FCO", name: "Rome Fiumicino", city: "Rome", country: "IT", region: "EU", lat: 41.8003, lon: 12.2389 },
  MXP: { code: "MXP", name: "Milan Malpensa", city: "Milan", country: "IT", region: "EU", lat: 45.6306, lon: 8.7281 },
  VCE: { code: "VCE", name: "Venice Marco Polo", city: "Venice", country: "IT", region: "EU", lat: 45.5053, lon: 12.3519 },
  VIE: { code: "VIE", name: "Vienna International", city: "Vienna", country: "AT", region: "EU", lat: 48.1103, lon: 16.5697 },
  BRU: { code: "BRU", name: "Brussels Airport", city: "Brussels", country: "BE", region: "EU", lat: 50.9010, lon: 4.4844 },
  DUB: { code: "DUB", name: "Dublin Airport", city: "Dublin", country: "IE", region: "EU", lat: 53.4264, lon: -6.2499 },
  LIS: { code: "LIS", name: "Lisbon Humberto Delgado", city: "Lisbon", country: "PT", region: "EU", lat: 38.7742, lon: -9.1342 },
  OPO: { code: "OPO", name: "Porto Airport", city: "Porto", country: "PT", region: "EU", lat: 41.2481, lon: -8.6814 },
  CPH: { code: "CPH", name: "Copenhagen Kastrup", city: "Copenhagen", country: "DK", region: "EU", lat: 55.6180, lon: 12.6508 },
  ARN: { code: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "SE", region: "EU", lat: 59.6498, lon: 17.9238 },
  OSL: { code: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "NO", region: "EEA", lat: 60.1976, lon: 11.1004 },
  HEL: { code: "HEL", name: "Helsinki Vantaa", city: "Helsinki", country: "FI", region: "EU", lat: 60.3172, lon: 24.9633 },
  WAW: { code: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "PL", region: "EU", lat: 52.1657, lon: 20.9671 },
  PRG: { code: "PRG", name: "Prague Vaclav Havel", city: "Prague", country: "CZ", region: "EU", lat: 50.1008, lon: 14.2600 },
  BUD: { code: "BUD", name: "Budapest Ferenc Liszt", city: "Budapest", country: "HU", region: "EU", lat: 47.4369, lon: 19.2556 },
  ATH: { code: "ATH", name: "Athens Eleftherios Venizelos", city: "Athens", country: "GR", region: "EU", lat: 37.9364, lon: 23.9445 },
  OTP: { code: "OTP", name: "Bucharest Henri Coanda", city: "Bucharest", country: "RO", region: "EU", lat: 44.5711, lon: 26.0850 },
  SOF: { code: "SOF", name: "Sofia Airport", city: "Sofia", country: "BG", region: "EU", lat: 42.6967, lon: 23.4114 },
  KEF: { code: "KEF", name: "Reykjavik Keflavik", city: "Reykjavik", country: "IS", region: "EEA", lat: 63.9850, lon: -22.6056 },
  // United Kingdom (UK261)
  LHR: { code: "LHR", name: "London Heathrow", city: "London", country: "GB", region: "UK", lat: 51.4700, lon: -0.4543 },
  LGW: { code: "LGW", name: "London Gatwick", city: "London", country: "GB", region: "UK", lat: 51.1537, lon: -0.1821 },
  STN: { code: "STN", name: "London Stansted", city: "London", country: "GB", region: "UK", lat: 51.8860, lon: 0.2389 },
  MAN: { code: "MAN", name: "Manchester Airport", city: "Manchester", country: "GB", region: "UK", lat: 53.3537, lon: -2.2750 },
  EDI: { code: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "GB", region: "UK", lat: 55.9508, lon: -3.3615 },
  // Turkey (SHY-PASSENGER / SHY-YOLCU)
  IST: { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "TR", region: "TR", lat: 41.2753, lon: 28.7519 },
  SAW: { code: "SAW", name: "Istanbul Sabiha Gokcen", city: "Istanbul", country: "TR", region: "TR", lat: 40.8986, lon: 29.3092 },
  ESB: { code: "ESB", name: "Ankara Esenboga", city: "Ankara", country: "TR", region: "TR", lat: 40.1281, lon: 32.9951 },
  AYT: { code: "AYT", name: "Antalya Airport", city: "Antalya", country: "TR", region: "TR", lat: 36.8987, lon: 30.8005 },
  ADB: { code: "ADB", name: "Izmir Adnan Menderes", city: "Izmir", country: "TR", region: "TR", lat: 38.2924, lon: 27.1570 },
  // United States (US DOT 14 CFR Parts 250 & 259)
  JFK: { code: "JFK", name: "New York JFK", city: "New York", country: "US", region: "US", lat: 40.6413, lon: -73.7781 },
  EWR: { code: "EWR", name: "Newark Liberty", city: "Newark", country: "US", region: "US", lat: 40.6895, lon: -74.1745 },
  BOS: { code: "BOS", name: "Boston Logan", city: "Boston", country: "US", region: "US", lat: 42.3656, lon: -71.0096 },
  IAD: { code: "IAD", name: "Washington Dulles", city: "Washington", country: "US", region: "US", lat: 38.9531, lon: -77.4565 },
  MIA: { code: "MIA", name: "Miami International", city: "Miami", country: "US", region: "US", lat: 25.7959, lon: -80.2870 },
  ATL: { code: "ATL", name: "Atlanta Hartsfield-Jackson", city: "Atlanta", country: "US", region: "US", lat: 33.6407, lon: -84.4277 },
  ORD: { code: "ORD", name: "Chicago O Hare", city: "Chicago", country: "US", region: "US", lat: 41.9742, lon: -87.9073 },
  DFW: { code: "DFW", name: "Dallas/Fort Worth", city: "Dallas", country: "US", region: "US", lat: 32.8998, lon: -97.0403 },
  LAX: { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US", region: "US", lat: 33.9416, lon: -118.4085 },
  SFO: { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "US", region: "US", lat: 37.6213, lon: -122.3790 },
  SEA: { code: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "US", region: "US", lat: 47.4502, lon: -122.3088 },
  // Global long-haul hubs
  YYZ: { code: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "CA", region: "OTHER", lat: 43.6777, lon: -79.6248 },
  YVR: { code: "YVR", name: "Vancouver International", city: "Vancouver", country: "CA", region: "OTHER", lat: 49.1967, lon: -123.1815 },
  MEX: { code: "MEX", name: "Mexico City Benito Juarez", city: "Mexico City", country: "MX", region: "OTHER", lat: 19.4363, lon: -99.0721 },
  GRU: { code: "GRU", name: "Sao Paulo Guarulhos", city: "Sao Paulo", country: "BR", region: "OTHER", lat: -23.4356, lon: -46.4731 },
  DXB: { code: "DXB", name: "Dubai International", city: "Dubai", country: "AE", region: "OTHER", lat: 25.2532, lon: 55.3657 },
  DOH: { code: "DOH", name: "Doha Hamad International", city: "Doha", country: "QA", region: "OTHER", lat: 25.2731, lon: 51.6081 },
  CAI: { code: "CAI", name: "Cairo International", city: "Cairo", country: "EG", region: "OTHER", lat: 30.1219, lon: 31.4056 },
  DEL: { code: "DEL", name: "Delhi Indira Gandhi", city: "New Delhi", country: "IN", region: "OTHER", lat: 28.5562, lon: 77.1000 },
  BOM: { code: "BOM", name: "Mumbai Chhatrapati Shivaji", city: "Mumbai", country: "IN", region: "OTHER", lat: 19.0896, lon: 72.8656 },
  SIN: { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "SG", region: "OTHER", lat: 1.3644, lon: 103.9915 },
  BKK: { code: "BKK", name: "Bangkok Suvarnabhumi", city: "Bangkok", country: "TH", region: "OTHER", lat: 13.6900, lon: 100.7501 },
  HKG: { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "HK", region: "OTHER", lat: 22.3080, lon: 113.9185 },
  ICN: { code: "ICN", name: "Seoul Incheon", city: "Seoul", country: "KR", region: "OTHER", lat: 37.4602, lon: 126.4407 },
  HND: { code: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "JP", region: "OTHER", lat: 35.5494, lon: 139.7798 },
  SYD: { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "AU", region: "OTHER", lat: -33.9399, lon: 151.1753 },
  JNB: { code: "JNB", name: "Johannesburg O R Tambo", city: "Johannesburg", country: "ZA", region: "OTHER", lat: -26.1392, lon: 28.2460 },
};

export const CARRIERS = {
  LH: { code: "LH", name: "Lufthansa", region: "EU", country: "DE" },
  LX: { code: "LX", name: "SWISS International Air Lines", region: "CH", country: "CH" },
  AF: { code: "AF", name: "Air France", region: "EU", country: "FR" },
  KL: { code: "KL", name: "KLM Royal Dutch Airlines", region: "EU", country: "NL" },
  IB: { code: "IB", name: "Iberia", region: "EU", country: "ES" },
  VY: { code: "VY", name: "Vueling", region: "EU", country: "ES" },
  AZ: { code: "AZ", name: "ITA Airways", region: "EU", country: "IT" },
  OS: { code: "OS", name: "Austrian Airlines", region: "EU", country: "AT" },
  SN: { code: "SN", name: "Brussels Airlines", region: "EU", country: "BE" },
  EI: { code: "EI", name: "Aer Lingus", region: "EU", country: "IE" },
  TP: { code: "TP", name: "TAP Air Portugal", region: "EU", country: "PT" },
  SK: { code: "SK", name: "SAS Scandinavian Airlines", region: "EU", country: "SE" },
  AY: { code: "AY", name: "Finnair", region: "EU", country: "FI" },
  LO: { code: "LO", name: "LOT Polish Airlines", region: "EU", country: "PL" },
  FR: { code: "FR", name: "Ryanair", region: "EU", country: "IE" },
  W6: { code: "W6", name: "Wizz Air", region: "EU", country: "HU" },
  A3: { code: "A3", name: "Aegean Airlines", region: "EU", country: "GR" },
  BA: { code: "BA", name: "British Airways", region: "UK", country: "GB" },
  VS: { code: "VS", name: "Virgin Atlantic", region: "UK", country: "GB" },
  U2: { code: "U2", name: "easyJet UK", region: "UK", country: "GB" },
  TK: { code: "TK", name: "Turkish Airlines", region: "TR", country: "TR" },
  PC: { code: "PC", name: "Pegasus Airlines", region: "TR", country: "TR" },
  VF: { code: "VF", name: "AJet", region: "TR", country: "TR" },
  XQ: { code: "XQ", name: "SunExpress", region: "TR", country: "TR" },
  UA: { code: "UA", name: "United Airlines", region: "US", country: "US" },
  DL: { code: "DL", name: "Delta Air Lines", region: "US", country: "US" },
  AA: { code: "AA", name: "American Airlines", region: "US", country: "US" },
  B6: { code: "B6", name: "JetBlue Airways", region: "US", country: "US" },
  AC: { code: "AC", name: "Air Canada", region: "OTHER", country: "CA" },
  EK: { code: "EK", name: "Emirates", region: "OTHER", country: "AE" },
  QR: { code: "QR", name: "Qatar Airways", region: "OTHER", country: "QA" },
  SQ: { code: "SQ", name: "Singapore Airlines", region: "OTHER", country: "SG" },
};

export const DISRUPTION_CAUSES = {
  technical_fault: {
    id: "technical_fault",
    label: "Aircraft Technical / Maintenance Fault",
    extraordinary: false,
    precedent: "CJEU C-549/07 (Wallentin-Hermann v Alitalia): routine or unexpected technical defects discovered during maintenance are inherent in airline operations and NOT extraordinary circumstances."
  },
  crew_shortage: {
    id: "crew_shortage",
    label: "Airline Crew Scheduling / Operational Shortage",
    extraordinary: false,
    precedent: "CJEU C-195/17 (Krüsemann v TUIfly): crew sickness, rostering gaps, and operational turnaround delays fall squarely within the carrier's control."
  },
  airline_strike: {
    id: "airline_strike",
    label: "Airline Own-Staff Strike (Pilots / Cabin Crew)",
    extraordinary: false,
    precedent: "CJEU C-28/20 (Airhelp v SAS): a strike organized by the operating carrier's own staff over wages or conditions is NOT an extraordinary circumstance."
  },
  denied_boarding_overbooked: {
    id: "denied_boarding_overbooked",
    label: "Involuntary Denied Boarding (Overbooking)",
    extraordinary: false,
    precedent: "EU261 Art. 4(3) / UK261 / SHY-PASSENGER Art. 5 / US 14 CFR Part 250: involuntary bumping triggers immediate statutory cash compensation regardless of external conditions."
  },
  atc_restriction: {
    id: "atc_restriction",
    label: "Third-Party Air Traffic Control Strike / Restriction",
    extraordinary: true,
    precedent: "EU261 Recital 15: externally mandated ATC strikes or Eurocontrol ATFM airspace closures generally exempt cash compensation, though Art. 9 Right to Care (meals, hotel, rerouting) ALWAYS still applies."
  },
  severe_weather: {
    id: "severe_weather",
    label: "Verified Severe Weather / Runway Closure",
    extraordinary: true,
    precedent: "EU261 Art. 5(3): meteorological conditions incompatible with safe operation (e.g., freezing rain ATFM closure, volcanic ash) exempt cash compensation if the carrier proves all reasonable measures; Art. 9 care ALWAYS applies."
  }
};

export const PRESET_SCENARIOS = [
  {
    id: "davos_fra_zrh",
    title: "Davos Corridor: FRA → ZRH (LH 4.2h Tech Delay)",
    origin: "FRA", destination: "ZRH", carrier: "LH",
    disruptionType: "delay", delayHours: 4.2, noticeDays: 0,
    cause: "technical_fault", passengers: 1, rerouteDelayHours: 0,
    flightNumber: "LH1186", flightDate: "2026-11-24", ticketFareUsd: 380
  },
  {
    id: "transatlantic_jfk_zrh",
    title: "Transatlantic: JFK → ZRH (LX 5.5h Crew Delay)",
    origin: "JFK", destination: "ZRH", carrier: "LX",
    disruptionType: "delay", delayHours: 5.5, noticeDays: 0,
    cause: "crew_shortage", passengers: 2, rerouteDelayHours: 0,
    flightNumber: "LX17", flightDate: "2026-11-25", ticketFareUsd: 1150
  },
  {
    id: "turkey_uk_ist_lhr",
    title: "Dual Regime: IST → LHR (TK Cancelled <7d)",
    origin: "IST", destination: "LHR", carrier: "TK",
    disruptionType: "cancellation", delayHours: 4.8, noticeDays: 2,
    cause: "technical_fault", passengers: 1, rerouteDelayHours: 4.8,
    flightNumber: "TK1985", flightDate: "2026-11-25", ticketFareUsd: 490
  },
  {
    id: "uk_us_lhr_jfk",
    title: "UK261 + US DOT: LHR → JFK (BA Staff Strike)",
    origin: "LHR", destination: "JFK", carrier: "BA",
    disruptionType: "delay", delayHours: 6.5, noticeDays: 0,
    cause: "airline_strike", passengers: 1, rerouteDelayHours: 0,
    flightNumber: "BA177", flightDate: "2026-11-26", ticketFareUsd: 920
  },
  {
    id: "domestic_tr_ist_ayt",
    title: "SHY-YOLCU Domestic: IST → AYT (TK Overbooked)",
    origin: "IST", destination: "AYT", carrier: "TK",
    disruptionType: "denied_boarding", delayHours: 3.5, noticeDays: 0,
    cause: "denied_boarding_overbooked", passengers: 1, rerouteDelayHours: 3.5,
    flightNumber: "TK2410", flightDate: "2026-11-26", ticketFareUsd: 160
  },
  {
    id: "atc_cdg_bcn",
    title: "Extraordinary Test: CDG → BCN (AF ATC Strike)",
    origin: "CDG", destination: "BCN", carrier: "AF",
    disruptionType: "cancellation", delayHours: 4.0, noticeDays: 0,
    cause: "atc_restriction", passengers: 1, rerouteDelayHours: 4.0,
    flightNumber: "AF1448", flightDate: "2026-11-26", ticketFareUsd: 240
  }
];

import requests
import json
import os
from datetime import datetime

API_KEY = os.environ.get("API_KEY", "YOUR_API_KEY_HERE")

CITIES = {
    "광명시": "41210",
    "시흥시": "41390",
}

TRADE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"
RENT_URL  = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent"


def get_months(n=3):
    months = []
    now = datetime.now()
    year, month = now.year, now.month
    for _ in range(n):
        months.append(f"{year}{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return months


def parse_items(res):
    try:
        items = res["response"]["body"]["items"]["item"]
        return [items] if isinstance(items, dict) else items
    except (KeyError, TypeError):
        return []


def fetch(url, lawd_cd, deal_ymd):
    params = {
        "serviceKey": API_KEY,
        "LAWD_CD": lawd_cd,
        "DEAL_YMD": deal_ymd,
        "numOfRows": 1000,
        "_type": "json",
    }
    try:
        res = requests.get(url, params=params, timeout=15)
        return parse_items(res.json())
    except Exception as e:
        print(f"  오류: {e}")
        return []


def fmt_trade(item, city):
    try:
        price = int(item.get("거래금액", "0").replace(",", "").strip())
        return {
            "type": "매매",
            "city": city,
            "apt": item.get("아파트", "").strip(),
            "dong": item.get("법정동", "").strip(),
            "area": round(float(item.get("전용면적", 0)), 2),
            "floor": str(item.get("층", "")).strip(),
            "price": price,
            "deposit": None,
            "year": str(item.get("년", "")),
            "month": str(item.get("월", "")),
            "day": str(item.get("일", "")),
            "built_year": str(item.get("건축년도", "")),
        }
    except Exception:
        return None


def fmt_rent(item, city):
    try:
        deposit = int(item.get("보증금액", "0").replace(",", "").strip())
        return {
            "type": "전세",
            "city": city,
            "apt": item.get("아파트", "").strip(),
            "dong": item.get("법정동", "").strip(),
            "area": round(float(item.get("전용면적", 0)), 2),
            "floor": str(item.get("층", "")).strip(),
            "price": None,
            "deposit": deposit,
            "year": str(item.get("년", "")),
            "month": str(item.get("월", "")),
            "day": str(item.get("일", "")),
            "built_year": str(item.get("건축년도", "")),
        }
    except Exception:
        return None


def sort_key(x):
    try:
        return f"{x['year']}{int(x['month']):02d}{int(x['day']):02d}"
    except Exception:
        return "00000000"


def main():
    months = get_months(3)
    all_data = []

    for city, code in CITIES.items():
        for month in months:
            print(f"[매매] {city} {month} 수집 중...")
            for item in fetch(TRADE_URL, code, month):
                r = fmt_trade(item, city)
                if r:
                    all_data.append(r)

            print(f"[전세] {city} {month} 수집 중...")
            for item in fetch(RENT_URL, code, month):
                r = fmt_rent(item, city)
                if r:
                    all_data.append(r)

    all_data.sort(key=sort_key, reverse=True)

    output = {
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "total": len(all_data),
        "data": all_data,
    }

    os.makedirs("data", exist_ok=True)
    with open("data/listings.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n완료! 총 {len(all_data)}건 저장됨.")


if __name__ == "__main__":
    main()

# 원본 시트

AI(Gemini/Nano Banana)로 만든 스프라이트 시트 원본. 에셋을 다시 뽑을 때
여기서 시작한다. 절대 `assets/`의 결과물만 보고 고치려 하지 마라 —
잘린 부분은 결과물에는 이미 없다.

| 파일 | 쓰는 스크립트 | 내용 |
|---|---|---|
| `frog_idle.png` | `frog.py` | 대나무 개구리 대기 4칸 |
| `frog_atk.png` | `frog.py` | 대나무 개구리 공격·도약 7칸 |
| `shaman_magic.png` | `shamanmagic.py` | 대나무 주술사 마법 4칸 (가운데 둘은 한 그림) |
| `demon.png` | `demonsheet.py` | 대나무 마왕 24칸 (대기5·포효5·공격5·폭발5·사망4) |

## 없는 시트

아래는 시트를 잃어버려 `assets/`의 결과물만 남아 있다.
다시 뽑으려면 시트를 구해야 한다. 해당 스크립트는 지금 못 돌린다.
시트를 구하면 괄호의 파일명으로 여기 넣는다 — 스크립트가 그 경로를 본다.

- **대나무 강도** — `bandit.py` (`bandit.png`)
- **대나무 유령불** — `wisp.py` (`wisp.png`)
- **그림자 표범** — `panther.py` (`panther_idle.png`, `panther_atk.png`)
- **보스 연출 이펙트** — `bossfx.py` (`bossfx.png`)
- **대나무 주술사 기본 5동작** (idle/walk/run/atk/cast) — 원본(`shaman_basic.png`)이
  없어 지팡이 끝을 `shamanstaff.py`로 추정 복원했다. 시트가 생기면 제대로 뽑는다.
- **배경** — 구역별 패럴랙스 3장씩. 원본 없음

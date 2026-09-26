import random
import tkinter as tk
import sys

from pathlib import Path
from PIL import Image, ImageTk


# ============================================================
# KONFIGURACJA
# ============================================================

WINDOW_WIDTH = 800
WINDOW_HEIGHT = 650

IMAGE_WIDTH = 500
IMAGE_HEIGHT = 350

SUPPORTED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".gif",
    ".webp",
}


# ============================================================
# ŚCIEŻKI
# ============================================================

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "dane"


# ============================================================
# STAN PROGRAMU
# ============================================================

lesson_folders = []

current_cards = []
missed_cards = []

current_index = 0

current_photo = None


# ============================================================
# FUNKCJE EKRANU STARTOWEGO
# ============================================================

def refresh_lessons():
    global lesson_folders

    lesson_list.delete(0, tk.END)

    # Jeżeli katalog "dane" nie istnieje
    if not DATA_DIR.exists():
        menu_status.config(
            text="Nie znaleziono katalogu 'dane'."
        )

        lesson_folders = []
        return

    # Pobierz wszystkie katalogi znajdujące się w "dane"
    lesson_folders = [
        folder
        for folder in DATA_DIR.iterdir()
        if folder.is_dir()
    ]

    # Posortuj alfabetycznie
    lesson_folders.sort(
        key=lambda folder: folder.name.lower()
    )

    # Dodaj nazwy folderów do listy w GUI
    for folder in lesson_folders:
        lesson_list.insert(
            tk.END,
            folder.name
        )

    if lesson_folders:
        menu_status.config(
            text=f"Znaleziono lekcji: {len(lesson_folders)}"
        )

        # Zaznacz pierwszą lekcję
        lesson_list.selection_set(0)

    else:
        menu_status.config(
            text="Nie znaleziono żadnych lekcji."
        )


def start_selected_lesson():
    global current_cards
    global missed_cards
    global current_index

    selection = lesson_list.curselection()

    # Nic nie zostało zaznaczone
    if not selection:
        menu_status.config(
            text="Najpierw wybierz lekcję."
        )
        return

    selected_index = selection[0]

    selected_folder = lesson_folders[selected_index]

    # Pobierz wszystkie obsługiwane obrazy
    cards = [
        file
        for file in selected_folder.iterdir()
        if (
            file.is_file()
            and file.suffix.lower() in SUPPORTED_EXTENSIONS
        )
    ]

    if not cards:
        menu_status.config(
            text="Ta lekcja nie zawiera grafik."
        )
        return

    # Losowanie kolejności
    random.shuffle(cards)

    current_cards = cards
    missed_cards = []

    current_index = 0

    lesson_title.config(
        text=f"Lekcja: {selected_folder.name}"
    )

    round_label.config(
        text="Pierwsza seria"
    )

    # Ukryj menu
    menu_frame.pack_forget()

    # Pokaż ekran lekcji
    lesson_frame.pack(
        fill="both",
        expand=True
    )

    show_card()


# ============================================================
# FUNKCJE FISZEK
# ============================================================

def show_card():
    global current_index
    global current_cards
    global missed_cards
    global current_photo

    # --------------------------------------------------------
    # Koniec aktualnej rundy
    # --------------------------------------------------------

    if current_index >= len(current_cards):

        # Są błędne odpowiedzi
        if missed_cards:

            current_cards = missed_cards.copy()

            missed_cards.clear()

            # Ponownie losujemy błędne fiszki
            random.shuffle(current_cards)

            current_index = 0

            round_label.config(
                text="Powtórka błędnych"
            )

        # Wszystko zaliczone
        else:
            image_label.config(
                image="",
                text="✓",
                font=("Sans", 100)
            )

            answer_label.config(
                text="Wszystkie fiszki zaliczone!"
            )

            counter_label.config(
                text=""
            )

            green_button.config(
                state="disabled"
            )

            red_button.config(
                state="disabled"
            )

            return

    # --------------------------------------------------------
    # Pobierz aktualną fiszkę
    # --------------------------------------------------------

    current_file = current_cards[current_index]

    # --------------------------------------------------------
    # Wczytaj grafikę
    # --------------------------------------------------------

    with Image.open(current_file) as image:

        image.thumbnail(
            (IMAGE_WIDTH, IMAGE_HEIGHT),
            Image.Resampling.LANCZOS
        )

        current_photo = ImageTk.PhotoImage(
            image.copy()
        )

    image_label.config(
        image=current_photo,
        text=""
    )

    # Ważne:
    # Tkinter musi zachować referencję do obrazu.
    image_label.image = current_photo

    # --------------------------------------------------------
    # Ukryj odpowiedź
    # --------------------------------------------------------

    answer_label.config(
        text="Kliknij symbol, aby zobaczyć odpowiedź"
    )

    green_button.config(
        state="disabled"
    )

    red_button.config(
        state="disabled"
    )

    # --------------------------------------------------------
    # Licznik
    # --------------------------------------------------------

    counter_label.config(
        text=(
            f"{current_index + 1} / "
            f"{len(current_cards)}"
        )
    )


def reveal_answer(event=None):

    if current_index >= len(current_cards):
        return

    current_file = current_cards[current_index]

    # Nazwa pliku bez rozszerzenia
    answer = current_file.stem

    answer_label.config(
        text=answer
    )

    green_button.config(
        state="normal"
    )

    red_button.config(
        state="normal"
    )


def mark_correct():
    global current_index

    current_index += 1

    show_card()


def mark_wrong():
    global current_index

    # Aktualna fiszka trafia do pamięci błędnych
    missed_cards.append(
        current_cards[current_index]
    )

    current_index += 1

    show_card()


def return_to_menu():

    lesson_frame.pack_forget()

    menu_frame.pack(
        fill="both",
        expand=True
    )

    refresh_lessons()


# ============================================================
# GŁÓWNE OKNO
# ============================================================

root = tk.Tk()

root.title("Fiszki")

root.geometry(
    f"{WINDOW_WIDTH}x{WINDOW_HEIGHT}"
)


# ============================================================
# EKRAN STARTOWY
# ============================================================

menu_frame = tk.Frame(root)

menu_frame.pack(
    fill="both",
    expand=True
)


title_label = tk.Label(
    menu_frame,
    text="FISZKI",
    font=("Sans", 32, "bold")
)

title_label.pack(
    pady=30
)


choose_label = tk.Label(
    menu_frame,
    text="Wybierz lekcję:",
    font=("Sans", 16)
)

choose_label.pack(
    pady=10
)


lesson_list = tk.Listbox(
    menu_frame,
    width=40,
    height=12,
    font=("Sans", 15)
)

lesson_list.pack(
    pady=10
)


start_button = tk.Button(
    menu_frame,
    text="Rozpocznij lekcję",
    font=("Sans", 15),
    command=start_selected_lesson
)

start_button.pack(
    pady=15
)


menu_status = tk.Label(
    menu_frame,
    text=""
)

menu_status.pack(
    pady=10
)


# ============================================================
# EKRAN LEKCJI
# ============================================================

lesson_frame = tk.Frame(root)


lesson_title = tk.Label(
    lesson_frame,
    text="",
    font=("Sans", 20, "bold")
)

lesson_title.pack(
    pady=10
)


round_label = tk.Label(
    lesson_frame,
    text="",
    font=("Sans", 12)
)

round_label.pack()


counter_label = tk.Label(
    lesson_frame,
    text="",
    font=("Sans", 12)
)

counter_label.pack(
    pady=5
)


image_label = tk.Label(
    lesson_frame,
    cursor="hand2"
)

image_label.pack(
    pady=20
)


image_label.bind(
    "<Button-1>",
    reveal_answer
)


answer_label = tk.Label(
    lesson_frame,
    text="",
    font=("Sans", 20)
)

answer_label.pack(
    pady=15
)


button_frame = tk.Frame(
    lesson_frame
)

button_frame.pack(
    pady=15
)


red_button = tk.Button(
    button_frame,
    text="✗",
    font=("Sans", 28),
    bg="red",
    fg="white",
    width=5,
    command=mark_wrong
)

red_button.pack(
    side="left",
    padx=25
)


green_button = tk.Button(
    button_frame,
    text="✓",
    font=("Sans", 28),
    bg="green",
    fg="white",
    width=5,
    command=mark_correct
)

green_button.pack(
    side="left",
    padx=25
)


back_button = tk.Button(
    lesson_frame,
    text="Powrót do listy lekcji",
    command=return_to_menu
)

back_button.pack(
    pady=20
)


# ============================================================
# START PROGRAMU
# ============================================================

refresh_lessons()

root.mainloop()

export type Movie = {
  id: number;
  title: string;
  description?: string;
  duration_minutes: number;
  genre: string;
  release_year?: number | null;
  poster_url?: string;
};

export type Hall = {
  id: number;
  name: string;
  total_rows: number;
  seats_per_row: number;
  total_seats?: number;
};

export type Screening = {
  id: number;
  movie: Movie;
  hall: Hall;
  start_time: string;
  end_time: string;
  language: string;
  is_3d: boolean;
  base_price: string;
};

export type SeatMapSeat = {
  id: number;
  row: number;
  number: number;
  is_reserved: boolean;
  is_held: boolean;
  held_by_me: boolean;
};

export type SeatMapResponse = {
  screening_id: number;
  hall_id: number;
  seats: SeatMapSeat[];
};

export type Reservation = {
  id: number;
  screening: number;
  customer_name: string;
  customer_email: string;
  status: string;
  created_at: string;
  reserved_seats?: Array<{
    id: number;
    reservation: number;
    screening: number;
    seat: number;
  }>;
};

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
  screening_detail?: Screening;
  customer_name: string;
  customer_email: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  payment_provider?: string;
  payment_reference?: string;
  payment_amount?: string;
  payment_completed_at?: string | null;
  ticket_code?: string | null;
  created_at: string;
  updated_at?: string;
  reserved_seats?: Array<{
    id: number;
    reservation: number;
    screening: number;
    seat: number;
    row?: number;
    number?: number;
  }>;
};

export type StartPaymentResponse = {
  reservation_id: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  payment_provider: string;
  payment_reference: string;
  payment_amount: string;
  currency: string;
};

export type ReservationQrResponse = {
  reservation_id: number;
  ticket_code: string;
  qr_image_base64: string;
};

export type AdminOverview = {
  stats: {
    movies: number;
    screenings: number;
    reservations: number;
    confirmed: number;
    pending: number;
    revenue: string;
  };

  latest_reservations: Array<{
    id: number;
    customer_name: string;
    movie: string;
    status: string;
    amount: string;
    created_at: string;
  }>;

  upcoming_screenings: Array<{
    id: number;
    movie: string;
    hall: string;
    start_time: string;
  }>;
};

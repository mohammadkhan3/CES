export type Showtime = {
  id: string;
  movie_id: string;
  showroom_id: string;
  showroom_name: string;
  date: string;
  time: string;
  duration: number;
};

export type ShowtimesByMovieData = {
  movie: {
    id: string;
    title: string;
    genre?: string;
    status?: string;
    description?: string;
    rating?: string;
    poster_url?: string;
    trailer_url?: string;
  };
  showtimes: Showtime[];
};

export type ShowtimesByMovieResponse = {
  data: ShowtimesByMovieData;
};

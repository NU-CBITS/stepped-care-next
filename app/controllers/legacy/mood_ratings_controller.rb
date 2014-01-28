class Legacy::MoodRatingsController < Legacy::ApiController
  def index
    @mood_ratings = MoodRating.where(user_id: params[:user_guid])
  end

  def create
    @mood_rating = MoodRating.new(
      user_id: params[:user_id],
      rating: params[:values][0]
    )

    unless @mood_rating.save
      render json: { status: 'error' }, status: 400
    end
  end

  def update
    @mood_rating = MoodRating.find(guid: params[:mood_rating_guid])

    asdf
  end
end

class Legacy::MoodRatingsController < Legacy::ApiController
  def index
    @mood_ratings = MoodRating.where(user_id: params[:user_guid])
  end

  def create
    @mood_rating = MoodRating.new(rating_params)

    if @mood_rating.save
      render 'create', status: 201
    else
      render json: { status: 'error' }, status: 400
    end
  end

  def update
    @mood_rating = MoodRating.where(guid: params[:mood_rating_guid]).first

    if !@mood_rating
      render json: { status: 'not found' }, status: 404
    elsif !@mood_rating.update(rating_params)
      render json: { status: 'error' }, status: 400
    end
  end

  private

  def rating_params
    {
      user_id: params[:user_id],
      rating: params[:values][0]
    }
  end
end

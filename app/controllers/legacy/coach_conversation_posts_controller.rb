class Legacy::CoachConversationPostsController < Legacy::ApiController
  def index
    @conversation_posts = ConversationPost.where(user_guid: params[:user_guid])
  end

  def create
    @conversation_post = ConversationPost.new(post_params)

    if @conversation_post.save
      render 'create', status: 201
    else
      render json: { status: 'error' }, status: 400
    end
  end

  private

  def post_params
    {
      user_guid: params[:user_id],
      text: params[:values][0],
      transmitted_at: params[:transmitted_at]
    }
  end
end

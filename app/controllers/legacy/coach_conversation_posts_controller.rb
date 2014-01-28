class Legacy::CoachConversationPostsController < Legacy::ApiController
  def index
    @conversation_posts = ConversationPost.where(user_id: params[:user_guid])
  end

  def create
    @conversation_post = ConversationPost.new(
      user_id: params[:user_id],
      group_id: params[:group_id],
      text: params[:values][0],
      transmitted_at: params[:transmitted_at]
    )

    unless @conversation_post.save
      render json: { status: 'error' }, status: 400
    end
  end
end

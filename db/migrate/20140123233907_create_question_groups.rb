class CreateQuestionGroups < ActiveRecord::Migration
  def change
    create_table :question_groups do |t|
      t.string :title
      t.string :guid

      t.timestamps
    end
  end
end

class CreateQuestions < ActiveRecord::Migration
  def change
    create_table :questions do |t|
      t.text :content
      t.string :guid
      t.text :metacontent_external

      t.timestamps
    end
  end
end

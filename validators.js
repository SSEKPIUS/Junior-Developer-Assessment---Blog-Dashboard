const Joi = require('joi');

const postSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().min(1).required(),
  content: Joi.string().min(1).required(),
  status: Joi.string().valid('published', 'draft').required(),
  createdAt: Joi.date().iso().required(),
  updatedAt: Joi.date().iso().required()
});

const validatePost = (post) => {
  return postSchema.validate(post);
};

module.exports = { validatePost };

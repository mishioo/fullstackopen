const supertest = require('supertest')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')
const { initialBlogs } = require('./test_helper')


beforeEach(async () => {
  await Blog.deleteMany({})

  const blogObjects = helper.initialBlogs
    .map(blog => new Blog(blog))
  const promiseArray = blogObjects.map(blog => blog.save())
  await Promise.all(promiseArray)
})

describe('/api/blogs', () => {
  describe('GET', () => {
    test('returned blogs are JSON', async () => {
      await api
        .get('/api/blogs')
        .expect(200)
        .expect('Content-Type', /application\/json/)
    })
    test('number of blogs is correct', async () => {
      const resp = await api.get('/api/blogs')
      expect(resp.body).toHaveLength(helper.initialBlogs.length)
    })
    test('returned entries contain id field', async () => {
      const resp = await api.get('/api/blogs')
      expect(resp.body[0].id).toBeDefined()
    })
  })
  describe('POST', () => {
    test('adding valid entry', async () => {
      const newBlog = {
        title: 'New blog entry for testing!',
        author: 'Besty Blogger',
        url: 'http://www.definitellyrealblog.com',
        likes: 42
      }
      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)
      const resp = await api.get('/api/blogs')
      const titles = resp.body.map(r => r.title)

      expect(resp.body).toHaveLength(initialBlogs.length + 1)
      expect(titles).toContain('New blog entry for testing!')
    })
    test('default value for likes field is added', async () => {
      const newBlog = {
        title: 'Missing likes and how to find them',
        author: 'Besty Blogger',
        url: 'http://www.definitellyrealblog.com',
      }
      const resp = await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)
      expect(resp.body.likes).toBeDefined()
      expect(resp.body.likes).toBe(0)
    })
    test('missing url causes code 400', async () => {
      const newBlog = {
        title: 'you won\'t get enywhere without url',
        author: 'Besty Blogger',
        likes: 1,
      }
      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)
    })
    test('missing title causes code 400', async () => {
      const newBlog = {
        author: 'Besty Blogger',
        url: 'http://www.titlessblog.com',
        likes: 1,
      }
      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)
    })
  })
})

describe('/api/blogs/:id', () => {
  describe('GET', () => {
    test('return value is JSON', async () => {
      const blog = await Blog.findOne({})
      await api
        .get(`/api/blogs/${blog._id}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
    })
    test('returns expected entry', async () => {
      const blog = await Blog.findOne({})
      const result = await api.get(`/api/blogs/${blog._id}`)
      expect(result.body.title).toBe(blog.title)
    })
  })
  describe('DELETE', () => {
    test('non existant', async () => {
      await api
        .delete(`/api/blogs/${await helper.nonExistingId()}`)
        .expect(204)
    })
    test('check if actually deleted', async () => {
      const blog = new Blog({ title: 'notitle', author: 'noauthor', url: 'nourl', likes: 1 })
      await blog.save()
      const id = blog._id.toString()
      await api
        .delete(`/api/blogs/${id}`)
        .expect(204)
      const ids = (await helper.entriesInDb()).map(blog => blog.id)
      expect(ids).not.toContain(id)
    })
  })
  describe('PUT', () => {
    test('changes number of likes', async () => {
      const blog = await Blog.findOne({})
      const result = await api
        .put(`/api/blogs/${blog._id}`)
        .send({ likes: 69 })
      expect(result.body.likes).toBe(69)
      const updated = await Blog.findById(blog._id)
      expect(updated.likes).toBe(69)
    })
  })
})

afterAll(() => mongoose.connection.close())
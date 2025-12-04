import React, { useState } from 'react';
import {
    Search,
    MessageSquare,
    ThumbsUp,
    MessageCircle,
    Share2,
    TrendingUp,
    Users,
    Award,
    Calendar,
    Eye
} from 'lucide-react';

const Community = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [posts] = useState([
        {
            id: 1,
            author: 'Dr. Sarah Johnson',
            role: 'Pharmacist',
            avatar: 'SJ',
            timestamp: '2 hours ago',
            content: 'Just implemented a new inventory management system at our pharmacy. The efficiency gains have been incredible! Happy to share insights with anyone interested.',
            likes: 24,
            comments: 8,
            shares: 3,
            tags: ['Inventory', 'Management', 'Tips']
        },
        {
            id: 2,
            author: 'Mike Chen',
            role: 'Pharmacy Manager',
            avatar: 'MC',
            timestamp: '5 hours ago',
            content: 'Looking for recommendations on the best practices for handling prescription refills. What systems do you use to track and notify patients?',
            likes: 15,
            comments: 12,
            shares: 2,
            tags: ['Prescriptions', 'Best Practices']
        },
        {
            id: 3,
            author: 'Emily Davis',
            role: 'Clinical Pharmacist',
            avatar: 'ED',
            timestamp: '1 day ago',
            content: 'Excited to announce that our pharmacy has achieved 99% customer satisfaction this quarter! Key factors: personalized service, efficient workflow, and staff training.',
            likes: 42,
            comments: 16,
            shares: 8,
            tags: ['Success Story', 'Customer Service']
        },
        {
            id: 4,
            author: 'James Wilson',
            role: 'Pharmacy Technician',
            avatar: 'JW',
            timestamp: '2 days ago',
            content: 'Does anyone have experience with automated dispensing systems? We\'re considering upgrading and would love to hear pros and cons.',
            likes: 18,
            comments: 22,
            shares: 5,
            tags: ['Technology', 'Automation', 'Question']
        }
    ]);

    const [trending] = useState([
        { topic: 'Inventory Management', posts: 156 },
        { topic: 'Patient Care', posts: 142 },
        { topic: 'Automation', posts: 98 },
        { topic: 'Compliance', posts: 87 },
        { topic: 'Staff Training', posts: 76 }
    ]);

    const filteredPosts = posts.filter(post =>
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Community Forum</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search discussions"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                        <MessageSquare size={18} />
                        <span>New Post</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="text-blue-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Members</div>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">2,847</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <MessageSquare className="text-green-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Discussions</div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">1,234</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Award className="text-purple-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Top Contributors</div>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">156</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Eye className="text-orange-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Today's Views</div>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">8.5K</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Feed */}
                <div className="col-span-2 space-y-4">
                    {filteredPosts.map(post => (
                        <div key={post.id} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                            {/* Author Info */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg">
                                    {post.avatar}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800">{post.author}</div>
                                    <div className="text-sm text-gray-500">{post.role}</div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar size={14} />
                                    <span>{post.timestamp}</span>
                                </div>
                            </div>

                            {/* Content */}
                            <p className="text-gray-700 mb-4 leading-relaxed">{post.content}</p>

                            {/* Tags */}
                            <div className="flex gap-2 mb-4">
                                {post.tags.map((tag, index) => (
                                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {/* Engagement */}
                            <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                                <button className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors">
                                    <ThumbsUp size={18} />
                                    <span className="text-sm font-medium">{post.likes}</span>
                                </button>
                                <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                                    <MessageCircle size={18} />
                                    <span className="text-sm font-medium">{post.comments}</span>
                                </button>
                                <button className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors">
                                    <Share2 size={18} />
                                    <span className="text-sm font-medium">{post.shares}</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredPosts.length === 0 && (
                        <div className="text-center text-gray-400 py-12">
                            No discussions found
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Trending Topics */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="text-green-600" size={20} />
                            <h3 className="font-bold text-gray-800">Trending Topics</h3>
                        </div>
                        <div className="space-y-3">
                            {trending.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                    <div>
                                        <div className="font-medium text-gray-800">#{item.topic}</div>
                                        <div className="text-xs text-gray-500">{item.posts} posts</div>
                                    </div>
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                                        {index + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Community Guidelines */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                        <h3 className="font-bold text-lg mb-3">Community Guidelines</h3>
                        <ul className="space-y-2 text-sm text-green-50">
                            <li className="flex items-start gap-2">
                                <span className="text-green-200">•</span>
                                <span>Be respectful and professional</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-200">•</span>
                                <span>Share knowledge and experiences</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-200">•</span>
                                <span>No spam or self-promotion</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-200">•</span>
                                <span>Protect patient privacy</span>
                            </li>
                        </ul>
                    </div>

                    {/* Top Contributors */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="text-purple-600" size={20} />
                            <h3 className="font-bold text-gray-800">Top Contributors</h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { name: 'Dr. Sarah Johnson', points: 1250, avatar: 'SJ' },
                                { name: 'Mike Chen', points: 980, avatar: 'MC' },
                                { name: 'Emily Davis', points: 875, avatar: 'ED' }
                            ].map((contributor, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                        {contributor.avatar}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800 text-sm">{contributor.name}</div>
                                        <div className="text-xs text-gray-500">{contributor.points} points</div>
                                    </div>
                                    <div className="text-purple-600 font-bold">#{index + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Community;

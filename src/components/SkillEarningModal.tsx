'use client';
import { useState } from 'react';

export default function SkillEarningModal({ quizResult, skillName, score, onClose }: any) {
  // Calculate earning based on score
  const getEarningData = () => {
    const baseEarning = 15000; // PKR
    const multiplier = score >= 80 ? 2.5 : score >= 60 ? 1.8 : 1.2;
    const monthlyEarning = Math.round(baseEarning * multiplier);

    const gigTitles: any = {
      English: 'I will teach fluent English speaking to students',
      Math: 'I will solve math problems and teach online',
      Science: 'I will create science notes and tutorials',
      Computer: 'I will build website / fix bugs',
      General: 'I will provide tutoring for ' + skillName,
    };

    const title = gigTitles[skillName] || gigTitles['General'];

    return {
      monthly: monthlyEarning,
      gigTitle: title,
      gigDesc: `Professional ${skillName} expert with ${score}% score. I will help you with ${skillName} projects, tutoring, and assignments. Fast delivery, 100% satisfaction. Contact now!`,
      tags: [skillName, 'tutoring', 'Pakistan', 'online teaching', 'homework help'],
      fiverrPrice: score >= 80 ? '$20' : '$10',
      localPrice: `Rs. ${Math.round(monthlyEarning / 10)} per task`,
    };
  };

  const data = getEarningData();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600">🎉 Congratulations!</h2>
          <p className="text-gray-600 mt-2">
            You scored {score}% in {skillName}
          </p>

          <div className="bg-green-50 p-4 rounded-xl mt-4 text-left">
            <p className="font-bold text-lg text-green-900">💰 Earning Potential: Rs. {data.monthly}/month</p>
            <p className="text-sm text-gray-600 mt-1">Based on your skill level</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl mt-4 text-left text-blue-950">
            <p className="font-bold">Your Fiverr Gig Ready:</p>
            <p className="text-sm mt-2">
              <b>Title:</b> {data.gigTitle}
            </p>
            <p className="text-sm mt-2">
              <b>Description:</b> {data.gigDesc}
            </p>
            <p className="text-sm mt-2">
              <b>Tags:</b> {data.tags.join(', ')}
            </p>
            <p className="text-sm mt-2">
              <b>Suggested Price:</b> {data.fiverrPrice} | {data.localPrice}
            </p>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(data.gigTitle + '\n\n' + data.gigDesc);
                alert('Copied!');
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition"
            >
              Copy Gig
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

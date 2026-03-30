import 'package:flutter/material.dart';

import 'profile_stat.dart';

class ProfileMetricsBar extends StatelessWidget {
  final dynamic postCount;
  final dynamic followerCount;
  final dynamic followingCount;
  final VoidCallback? onPostsTap;
  final VoidCallback? onFollowersTap;
  final VoidCallback? onFollowingTap;

  const ProfileMetricsBar({Key? key, required this.postCount, required this.followerCount, required this.followingCount, this.onPostsTap = null, this.onFollowersTap = null, this.onFollowingTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(22), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          ProfileStat(
            value: postCount,
            label: 'Posts',
          ),
          SizedBox(width: 8),
          InkWell(
            onTap: onFollowersTap,
            child: ProfileStat(
              value: followerCount,
              label: 'Followers',
            ),
          ),
          SizedBox(width: 8),
          InkWell(
            onTap: onFollowingTap,
            child: ProfileStat(
              value: followingCount,
              label: 'Following',
            ),
          ),
        ],
      ),
    );
  }
}
